import fs from "fs";
import path from "path";
import { createPublicKey } from "crypto";
import { joseImport } from "../utils/joseDynamic";

type KeyEntry = {
  kid: string;
  privatePem: string;
  publicPem: string;
  alg: string;
};

function parseKidFromFilename(
  name: string
): { kid: string; alg: string } | null {
  const m = name.match(/^jwt-(ES256|RS256)-\d{4}-\d{2}_(private|public)\.pem$/);
  if (!m) return null;
  const base = name.replace(/_(private|public)\.pem$/, "");
  const alg = m[1];
  return { kid: base, alg };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

class KeysService {
  private keys: KeyEntry[] = [];
  private activeKid: string | null = null;

  private ensureLoaded() {
    if (this.keys.length) return;
    const dir = process.env.JWT_KEYS_DIR || process.cwd();
    const files = fs.readdirSync(dir);
    const bases = uniq(
      files
        .map((f) => parseKidFromFilename(f)?.kid)
        .filter((v): v is string => !!v)
    );
    for (const base of bases) {
      const alg = parseKidFromFilename(base + "_private.pem")?.alg || "ES256";
      const privPath = path.join(dir, base + "_private.pem");
      const pubPath = path.join(dir, base + "_public.pem");
      let privatePem = "";
      let publicPem = "";
      if (fs.existsSync(privPath))
        privatePem = fs.readFileSync(privPath, "utf8");
      if (fs.existsSync(pubPath)) publicPem = fs.readFileSync(pubPath, "utf8");
      if (!publicPem && privatePem) {
        const pub = createPublicKey(privatePem).export({
          type: "spki",
          format: "pem",
        }) as string;
        publicPem = pub;
      }
      if (!privatePem || !publicPem) continue;
      this.keys.push({ kid: base, privatePem, publicPem, alg });
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
      if (inlinePriv && inlinePub)
        this.keys.push({
          kid,
          privatePem: inlinePriv,
          publicPem: inlinePub,
          alg,
        });
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
  }

  setActiveKid(kid: string) {
    this.ensureLoaded();
    if (this.keys.find((k) => k.kid === kid)) this.activeKid = kid;
  }

  getActive(): KeyEntry {
    this.ensureLoaded();
    if (!this.activeKid) throw new Error("no_active_kid");
    const k = this.keys.find((x) => x.kid === this.activeKid);
    if (!k) throw new Error("active_kid_not_found");
    return k;
  }

  getByKid(kid: string): KeyEntry | null {
    this.ensureLoaded();
    return this.keys.find((k) => k.kid === kid) || null;
  }

  async getJWKS() {
    this.ensureLoaded();
    const { importSPKI, exportJWK } = await joseImport();
    const out = [];
    for (const k of this.keys) {
      const pub = await importSPKI(k.publicPem, k.alg);
      const jwk = await exportJWK(pub);
      out.push({ ...jwk, use: "sig", alg: k.alg, kid: k.kid });
    }
    return out;
  }
}

export const keysService = new KeysService();
