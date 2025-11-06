import fs from "fs";
import path from "path";
import { joseImport } from "../utils/joseDynamic";
import { getLogger } from "../utils/log/logger";
import { safeErr } from "../utils/log/log.helpers";

const log = getLogger({ svc: "EnsureJwtKeys" });

const KID_BASE_REGEX = /^jwt-(ES256|RS256|PS256|EdDSA)-(\d{4}-\d{2})$/;
const FILE_REGEX = /^jwt-(ES256|RS256|PS256|EdDSA)-\d{4}-\d{2}_(private|public)\.pem$/;
const TRUTHY = new Set(["1", "true", "yes", "on"]);

const formatTag = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const addMonths = (date: Date, months: number) => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
};

const normalizeDir = (raw: string | undefined): string => {
  const trimmed = (raw || "").trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/\\/g, path.sep);
};

const isWindowsPath = (dir: string) => /^[a-zA-Z]:\\/.test(dir) || /^[a-zA-Z]:\//.test(dir);

const shouldAutoGenerate = () => {
  const flag = (process.env.JWT_AUTO_GENERATE_KEYS || "").trim().toLowerCase();
  if (flag) return TRUTHY.has(flag);
  return (process.env.NODE_ENV || "development").toLowerCase() !== "production";
};

const parseConfiguredKids = () => {
  const sources = [process.env.JWT_KEYS_ROTATION_TAGS, process.env.JWT_KID]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .flatMap((value) => value.split(","));
  const tags = new Set<string>();
  for (const raw of sources) {
    const token = raw.trim();
    if (!token) continue;
    if (KID_BASE_REGEX.test(token)) {
      const [, alg, tag] = token.match(KID_BASE_REGEX) as RegExpMatchArray;
      tags.add(`${alg}:${tag}`);
      continue;
    }
    const tagMatch = token.match(/^(\d{4})-(\d{2})$/);
    if (tagMatch) {
      const alg = (process.env.JWT_ALG || "ES256").toUpperCase();
      tags.add(`${alg}:${tagMatch[0]}`);
    }
  }
  if (tags.size) return Array.from(tags);
  const alg = (process.env.JWT_ALG || "ES256").toUpperCase();
  const now = new Date();
  const defaults = [formatTag(now), formatTag(addMonths(now, 6))];
  return defaults.map((tag) => `${alg}:${tag}`);
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`JWT_KEYS_DIR path ${dir} is not a directory`);
  }
};

const listValidKids = (dir: string) => {
  if (!fs.existsSync(dir)) return [] as string[];
  const files = fs.readdirSync(dir);
  const byKid = new Map<string, { alg: string; hasPriv: boolean; hasPub: boolean }>();
  for (const file of files) {
    if (!FILE_REGEX.test(file)) continue;
    const match = file.match(/^(jwt-(?:ES256|RS256|PS256|EdDSA)-\d{4}-\d{2})_(private|public)\.pem$/);
    if (!match) continue;
    const [, base, type] = match;
    const algMatch = base.match(KID_BASE_REGEX);
    if (!algMatch) continue;
    const [, alg] = algMatch;
    const current = byKid.get(base) || { alg, hasPriv: false, hasPub: false };
    if (type === "private") current.hasPriv = true;
    if (type === "public") current.hasPub = true;
    byKid.set(base, current);
  }
  return Array.from(byKid.entries())
    .filter(([, meta]) => meta.hasPriv && meta.hasPub)
    .map(([kid]) => kid);
};

const writeKeyPair = async (dir: string, kid: string, alg: string) => {
  const { generateKeyPair, exportPKCS8, exportSPKI } = await joseImport();
  const { publicKey, privateKey } = await generateKeyPair(alg as any, {
    extractable: true,
  });
  const privPem = await exportPKCS8(privateKey);
  const pubPem = await exportSPKI(publicKey);
  const privPath = path.join(dir, `${kid}_private.pem`);
  const pubPath = path.join(dir, `${kid}_public.pem`);
  fs.writeFileSync(privPath, privPem, { encoding: "utf8", mode: 0o600 });
  fs.writeFileSync(pubPath, pubPem, { encoding: "utf8", mode: 0o644 });
};

export const ensureJwtKeys = async () => {
  const configured = normalizeDir(process.env.JWT_KEYS_DIR);
  const cwdFallback = path.join(process.cwd(), "keys");
  let targetDir = configured;

  if (!targetDir) {
    targetDir = cwdFallback;
  } else if (isWindowsPath(targetDir) && process.platform !== "win32") {
    log.warn({ evt: "jwt.keys.win_path", configured: targetDir, fallback: cwdFallback });
    targetDir = cwdFallback;
  }

  try {
    ensureDir(targetDir);
  } catch (error) {
    log.error({ evt: "jwt.keys.dir.invalid", dir: targetDir, err: safeErr(error) });
    throw error;
  }

  process.env.JWT_KEYS_DIR = targetDir;

  const existing = listValidKids(targetDir);
  if (existing.length) {
    if (process.env.JWT_KID && existing.includes(process.env.JWT_KID)) {
      return;
    }
    const newest = existing.sort().reverse()[0];
    process.env.JWT_KID = newest;
    return;
  }

  if (!shouldAutoGenerate()) {
    log.error({
      evt: "jwt.keys.missing",
      dir: targetDir,
      hint: "Generate PEMs into JWT_KEYS_DIR or set JWT_AUTO_GENERATE_KEYS=1 for ephemeral pairs",
    });
    throw new Error("no_keys_found");
  }

  const pairs = parseConfiguredKids();
  const kids: string[] = [];

  for (const entry of pairs) {
    const [alg, tag] = entry.split(":");
    const normalizedAlg = alg.toUpperCase();
    const kid = `jwt-${normalizedAlg}-${tag}`;
    try {
      await writeKeyPair(targetDir, kid, normalizedAlg);
      log.info({ evt: "jwt.keys.generated", kid, alg: normalizedAlg, dir: targetDir });
      kids.push(kid);
    } catch (error) {
      log.error({ evt: "jwt.keys.generate_failed", kid, alg: normalizedAlg, err: safeErr(error) });
      throw error;
    }
  }

  if (!kids.length) {
    throw new Error("no_keys_found");
  }

  if (!process.env.JWT_KID || !kids.includes(process.env.JWT_KID)) {
    process.env.JWT_KID = kids[0];
  }
};
