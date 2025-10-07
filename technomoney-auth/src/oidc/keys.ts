import fs from "fs";
import path from "path";
import type { JWTPayload } from "jose";
import { joseImport } from "../utils/joseDynamic";

const ISS = process.env.JWT_ISSUER || "auth";
const AUD_ACCESS = process.env.JWT_AUDIENCE || "web";
const ACCESS_TTL = process.env.JWT_EXPIRES_IN || "5m";
const KEYS_DIR = process.env.JWT_KEYS_DIR || process.cwd();

type Entry = {
  kid: string;
  alg: "ES256" | "RS256";
  privPem: string;
  pubPem: string;
};

function normalizeEnvKey(v?: string) {
  if (!v) return "";
  let s = v.trim();
  s = s.replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
  s = s.replace(/\\n/g, "\n");
  return s;
}

function wrapPemIfNeeded(raw: string, label: "PRIVATE KEY" | "PUBLIC KEY") {
  const s = raw.trim();
  if (s.startsWith("-----BEGIN ")) return s;
  const base = s.replace(/\s+/g, "");
  const chunks: string[] = [];
  for (let i = 0; i < base.length; i += 64) chunks.push(base.slice(i, i + 64));
  return `-----BEGIN ${label}-----\n${chunks.join(
    "\n"
  )}\n-----END ${label}-----\n`;
}

function parseKidAlgFromBase(
  base: string
): { kid: string; alg: "ES256" | "RS256" } | null {
  const m = base.match(/^jwt-(ES256|RS256)-\d{4}-\d{2}$/);
  if (!m) return null;
  return { kid: base, alg: m[1] as "ES256" | "RS256" };
}

function listDiskEntries(): Entry[] {
  const files = fs.existsSync(KEYS_DIR) ? fs.readdirSync(KEYS_DIR) : [];
  const bases = Array.from(
    new Set(
      files
        .map((f) =>
          f.match(/^(jwt-(?:ES256|RS256)-\d{4}-\d{2})_(private|public)\.pem$/)
        )
        .filter(Boolean)
        .map((m) => (m ? m[1] : ""))
    )
  ).filter(Boolean);
  const out: Entry[] = [];
  for (const b of bases) {
    const meta = parseKidAlgFromBase(b);
    if (!meta) continue;
    const privPath = path.join(KEYS_DIR, `${b}_private.pem`);
    const pubPath = path.join(KEYS_DIR, `${b}_public.pem`);
    if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) continue;
    const privPem = fs.readFileSync(privPath, "utf8");
    const pubPem = fs.readFileSync(pubPath, "utf8");
    out.push({ kid: meta.kid, alg: meta.alg, privPem, pubPem });
  }
  return out.sort((a, b) => {
    const ax = a.kid.match(/-(\d{4})-(\d{2})$/);
    const bx = b.kid.match(/-(\d{4})-(\d{2})$/);
    const an = ax ? Number(ax[1]) * 100 + Number(ax[2]) : 0;
    const bn = bx ? Number(bx[1]) * 100 + Number(bx[2]) : 0;
    return bn - an;
  });
}

let cachedEntries: Entry[] | null = null;
let cachedPrivByKid: Record<string, CryptoKey> = {};
let cachedPubByKid: Record<string, CryptoKey> = {};

function entries(): Entry[] {
  if (cachedEntries) return cachedEntries;
  const disk = listDiskEntries();
  if (disk.length) {
    cachedEntries = disk;
    return cachedEntries;
  }
  const envPriv = normalizeEnvKey(process.env.JWT_PRIVATE_KEY);
  const envPub = normalizeEnvKey(process.env.JWT_PUBLIC_KEY);
  const envAlg = (process.env.JWT_ALG || "RS256") as "ES256" | "RS256";
  const envKid = process.env.JWT_KID || "dev";
  if (!envPriv || !envPub) throw new Error("no_keys_found");
  cachedEntries = [
    {
      kid: envKid,
      alg: envAlg,
      privPem: wrapPemIfNeeded(envPriv, "PRIVATE KEY"),
      pubPem: wrapPemIfNeeded(envPub, "PUBLIC KEY"),
    },
  ];
  return cachedEntries;
}

function activeKid(): string {
  const list = entries();
  const fromEnv = process.env.JWT_KID;
  if (fromEnv && list.find((e) => e.kid === fromEnv)) return fromEnv;
  return list[0].kid;
}

function activeEntry(): Entry {
  const kid = activeKid();
  const e = entries().find((x) => x.kid === kid);
  if (!e) throw new Error("active_kid_not_found");
  return e;
}

export async function signAccess(
  sub: string,
  scope: string[],
  claims: Record<string, any>
) {
  const { SignJWT, importPKCS8 } = await joseImport();
  const e = activeEntry();
  if (!cachedPrivByKid[e.kid])
    cachedPrivByKid[e.kid] = await importPKCS8(e.privPem, e.alg);
  return await new SignJWT({ ...claims, scope, typ: "access" })
    .setProtectedHeader({ alg: e.alg, kid: e.kid })
    .setIssuer(ISS)
    .setAudience(AUD_ACCESS)
    .setSubject(String(sub))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(cachedPrivByKid[e.kid]);
}

export async function signIdToken(
  sub: string,
  aud: string,
  nonce: string | undefined,
  claims: Record<string, any>
) {
  const { SignJWT, importPKCS8 } = await joseImport();
  const e = activeEntry();
  if (!cachedPrivByKid[e.kid])
    cachedPrivByKid[e.kid] = await importPKCS8(e.privPem, e.alg);
  const jwt = new SignJWT({ ...claims, nonce, typ: "id" } as JWTPayload)
    .setProtectedHeader({ alg: e.alg, kid: e.kid })
    .setIssuer(ISS)
    .setAudience(aud)
    .setSubject(String(sub))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL);
  return await jwt.sign(cachedPrivByKid[e.kid]);
}

export async function jwks() {
  const { importSPKI, exportJWK } = await joseImport();
  const list = entries();
  const keys = [];
  for (const e of list) {
    if (!cachedPubByKid[e.kid])
      cachedPubByKid[e.kid] = await importSPKI(e.pubPem, e.alg);
    const jwk = await exportJWK(cachedPubByKid[e.kid]);
    keys.push({ ...jwk, kid: e.kid, alg: e.alg, use: "sig" });
  }
  return { keys };
}

export function issuer() {
  return ISS;
}

export function audienceAccess() {
  return AUD_ACCESS;
}

export function kid() {
  return activeEntry().kid;
}

export function alg() {
  return activeEntry().alg;
}
