import type { JWSHeaderParameters, JWTPayload } from "jose";
import { joseImport } from "../utils/joseDynamic";
import { getLogger } from "../utils/log/logger";
import { mask, maskJti, safeErr } from "../utils/log/log.helpers";

const ISS = process.env.AUTH_ISSUER || "";
const AUD = process.env.AUTH_AUDIENCE || "";
const TOL = Number(process.env.AUTH_CLOCK_TOLERANCE || "5");
const JWKS_URL = process.env.AUTH_JWKS_URL || "";
const ALGS = (process.env.AUTH_ALLOWED_ALGS || "ES256,RS256,PS256,EdDSA")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const JWKS_TIMEOUT = Number(process.env.AUTH_JWKS_TIMEOUT_MS || "10000");
const JWKS_COOLDOWN = Number(process.env.AUTH_JWKS_COOLDOWN_MS || "30000");

let _jwks: any | null = null;

async function getJWKS() {
  if (_jwks) return _jwks;
  if (!JWKS_URL) throw new Error("JWKS_URL_MISSING");
  const { createRemoteJWKSet } = await joseImport();
  _jwks = createRemoteJWKSet(new URL(JWKS_URL), {
    timeoutDuration: JWKS_TIMEOUT,
    cooldownDuration: JWKS_COOLDOWN,
  });
  return _jwks;
}

function parseScope(s: unknown): string[] {
  if (Array.isArray(s))
    return s.filter((v) => typeof v === "string") as string[];
  if (typeof s === "string") return s.trim().split(/\s+/).filter(Boolean);
  return [];
}

export class JwtVerifierService {
  private log = getLogger({ svc: "JwtVerifierService" });

  async verifyAccess(token: string): Promise<{
    id: string;
    jti: string;
    scope: string[];
    payload: JWTPayload;
    header: JWSHeaderParameters;
  }> {
    if (!ISS || !AUD) throw new Error("ISS_AUD_MISSING");
    const { jwtVerify } = await joseImport();
    const JWKS = await getJWKS();
    this.log.debug({ evt: "jwt.verify.start" });
    try {
      const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
        issuer: ISS,
        audience: AUD,
        clockTolerance: TOL,
      });
      const alg = String(protectedHeader.alg || "");
      const kid = String(protectedHeader.kid || "");
      if (ALGS.length && !ALGS.includes(alg))
        throw new Error("ALG_NOT_ALLOWED");
      if (
        protectedHeader.typ &&
        String(protectedHeader.typ).toUpperCase() !== "JWT"
      ) {
        throw new Error("TYP_NOT_JWT");
      }
      const id = String(payload.sub || "");
      const jti = String(payload.jti || "");
      const scope = parseScope(payload.scope);
      this.log.debug({
        evt: "jwt.verify.ok",
        kid,
        alg,
        sub: mask(id),
        jti: maskJti(jti),
      });
      return { id, jti, scope, payload, header: protectedHeader };
    } catch (e: any) {
      this.log.warn({ evt: "jwt.verify.fail", err: safeErr(e) });
      throw e;
    }
  }
}
