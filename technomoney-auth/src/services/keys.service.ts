import fs from "fs";
import path from "path";
import { createPublicKey } from "crypto";
import { joseImport } from "../utils/joseDynamic";
import { getLogger } from "../utils/log/logger";
import { safeErr } from "../utils/log/log.helpers";

type KeyEntry = {
  kid: string;
  privatePem: string;
  publicPem: string;
  alg: string;
};

function parseKidFromFilename(
  name: string
): { kid: string; alg: string } | null {
  const m = name.match(
    /^jwt-(ES256|RS256|PS256|EdDSA)-\d{4}-\d{2}_(private|public)\.pem$/
  );
  if (!m) return null;
  const base = name.replace(/_(private|public)\.pem$/, "");
  const alg = m[1];
  return { kid: base, alg };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

class KeysService {
  private log = getLogger({ svc: "KeysService" });
  private keys: KeyEntry[] = [];
  private activeKid: string | null = null;
  private allowedAlgs = (process.env.JWT_ALLOWED_ALGS_VERIFY || "ES256")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  private ensureLoaded() {
    if (this.keys.length) return;

    const dir = process.env.JWT_KEYS_DIR || process.cwd();
    this.log.debug({ evt: "keys.load.start", dir });

    let files: string[] = [];
    try {
      files = fs.readdirSync(dir);
    } catch (e) {
      this.log.warn({ evt: "keys.dir.read_fail", dir, err: safeErr(e) });
      files = [];
    }

    const bases = uniq(
      files
        .map((f) => parseKidFromFilename(f)?.kid)
        .filter((v): v is string => !!v)
    );

    for (const base of bases) {
      try {
        const parsed = parseKidFromFilename(base + "_private.pem");
        const alg = parsed?.alg || "ES256";
        if (this.allowedAlgs.length && !this.allowedAlgs.includes(alg)) {
          this.log.warn({ evt: "keys.skip.alg_not_allowed", kid: base, alg });
          continue;
        }
        const privPath = path.join(dir, base + "_private.pem");
        const pubPath = path.join(dir, base + "_public.pem");
        let privatePem = "";
        let publicPem = "";

        if (fs.existsSync(privPath))
          privatePem = fs.readFileSync(privPath, "utf8");
        if (fs.existsSync(pubPath))
          publicPem = fs.readFileSync(pubPath, "utf8");

        if (!publicPem && privatePem) {
          try {
            const pub = createPublicKey(privatePem).export({
              type: "spki",
              format: "pem",
            }) as string;
            publicPem = pub;
            this.log.debug({ evt: "keys.pub.derived", kid: base, alg });
          } catch (e) {
            this.log.warn({
              evt: "keys.pub.derive_fail",
              kid: base,
              alg,
              err: safeErr(e),
            });
          }
        }

        if (!privatePem || !publicPem) {
          this.log.warn({
            evt: "keys.skip.missing_pair",
            kid: base,
            hasPriv: !!privatePem,
            hasPub: !!publicPem,
          });
          continue;
        }

        this.keys.push({ kid: base, privatePem, publicPem, alg });
        this.log.debug({ evt: "keys.loaded", kid: base, alg });
      } catch (e) {
        this.log.warn({
          evt: "keys.skip.load_error",
          kid: base,
          err: safeErr(e),
        });
      }
    }

    if (!this.keys.length) {
      const inlinePriv = (process.env.JWT_PRIVATE_KEY || "")
        .replace(/^"([\s\S]*)"$/, "$1")
        .replace(/^'([\s\S]*)'$/, "$1");
      const inlinePub = (process.env.JWT_PUBLIC_KEY || "")
        .replace(/^"([\s\S]*)"$/, "$1")
        .replace(/^'([\s\S]*)'$/, "$1");
      const alg = process.env.JWT_ALG || "RS256";
      const kid = process.env.JWT_KID || "dev";

      if (inlinePriv && inlinePub) {
        if (this.allowedAlgs.length && !this.allowedAlgs.includes(alg)) {
          this.log.warn({ evt: "keys.inline.alg_not_allowed", kid, alg });
        } else {
          this.keys.push({
            kid,
            privatePem: inlinePriv,
            publicPem: inlinePub,
            alg,
          });
          this.log.warn({ evt: "keys.inline.used", kid, alg });
        }
      }
    }

    if (!this.keys.length) {
      if (process.env.NODE_ENV === "production") {
        this.log.error({ evt: "keys.none_found_prod" });
        throw new Error("no_keys_found");
      } else {
        this.log.warn({ evt: "keys.none_found_dev" });
      }
    }

    if (!this.activeKid) {
      const fromEnv = process.env.JWT_KID || "";
      const list = this.keys.slice().sort((a, b) => {
        const ax = a.kid.match(/-(\d{4})-(\d{2})$/);
        const bx = b.kid.match(/-(\d{4})-(\d{2})$/);
        const an = ax ? Number(ax[1]) * 100 + Number(ax[2]) : 0;
        const bn = bx ? Number(bx[1]) * 100 + Number(bx[2]) : 0;
        return bn - an;
      });
      this.activeKid =
        list.find((k) => k.kid === fromEnv)?.kid || list[0]?.kid || null;
    }

    if (!this.activeKid) {
      this.log.error({ evt: "keys.active.missing" });
      throw new Error("no_active_kid");
    }

    const active = this.keys.find((x) => x.kid === this.activeKid);
    this.log.info({
      evt: "keys.load.ok",
      count: this.keys.length,
      activeKid: this.activeKid,
      activeAlg: active?.alg,
    });
  }

  setActiveKid(kid: string) {
    this.ensureLoaded();
    const prev = this.activeKid;
    if (this.keys.find((k) => k.kid === kid)) {
      this.activeKid = kid;
      this.log.info({ evt: "keys.active.set", from: prev, to: kid });
    } else {
      this.log.warn({ evt: "keys.active.set_unknown", kid });
    }
  }

  getActive(): KeyEntry {
    this.ensureLoaded();
    if (!this.activeKid) {
      this.log.error({ evt: "keys.active.none" });
      throw new Error("no_active_kid");
    }
    const k = this.keys.find((x) => x.kid === this.activeKid);
    if (!k) {
      this.log.error({ evt: "keys.active.not_found", kid: this.activeKid });
      throw new Error("active_kid_not_found");
    }
    return k;
  }

  getByKid(kid: string): KeyEntry | null {
    this.ensureLoaded();
    const k = this.keys.find((x) => x.kid === kid) || null;
    if (!k) this.log.debug({ evt: "keys.getByKid.miss", kid });
    return k;
  }

  async getJWKS() {
    this.ensureLoaded();
    const { importSPKI, exportJWK } = await joseImport();
    const out: any[] = [];
    for (const k of this.keys) {
      try {
        const pub = await importSPKI(k.publicPem, k.alg);
        const jwk = await exportJWK(pub);
        out.push({ ...jwk, use: "sig", alg: k.alg, kid: k.kid });
      } catch (e) {
        this.log.warn({
          evt: "jwks.export.fail",
          kid: k.kid,
          alg: k.alg,
          err: safeErr(e),
        });
      }
    }
    this.log.info({ evt: "jwks.export.ok", count: out.length });
    return out;
  }
}

export const keysService = new KeysService();
