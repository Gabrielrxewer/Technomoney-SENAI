import type {
  JWSHeaderParameters,
  JWTPayload,
  FlattenedJWSInput,
  KeyLike,
} from "jose";
import { joseImport } from "../utils/joseDynamic";
import { logger } from "../utils/logger";

const ISS = process.env.AUTH_ISSUER as string;
const AUD = process.env.AUTH_AUDIENCE as string;
const TOL = Number(process.env.AUTH_CLOCK_TOLERANCE || "5");
const JWKS_URL = process.env.AUTH_JWKS_URL as string;
const ALGS = (process.env.AUTH_ALLOWED_ALGS || "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => !!s);
const LOCAL_JWKS_RAW = process.env.AUTH_STATIC_JWKS || "";

async function fetchJwksKids(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      keys?: Array<{ kid?: string; alg?: string }>;
    };
    return (data.keys || []).map((k) => String(k.kid || ""));
  } catch {
    return [];
  }
}

export class JwtVerifierService {
  async verifyAccess(token: string): Promise<{
    id: string;
    jti: string;
    scope: string[];
    payload: JWTPayload;
    header: JWSHeaderParameters;
  }> {
    let header: JWSHeaderParameters | undefined;
    try {
      const {
        createRemoteJWKSet,
        createLocalJWKSet,
        jwtVerify,
        decodeProtectedHeader,
      } = await joseImport();

      header = decodeProtectedHeader(token);

      const remote = createRemoteJWKSet(new URL(JWKS_URL));
      const local = LOCAL_JWKS_RAW
        ? createLocalJWKSet(JSON.parse(LOCAL_JWKS_RAW))
        : null;

      const getKey = async (
        protectedHeader: JWSHeaderParameters,
        flattened: FlattenedJWSInput
      ): Promise<KeyLike | Uint8Array> => {
        if (local) {
          try {
            return await local(protectedHeader, flattened);
          } catch {}
        }
        return await remote(protectedHeader, flattened);
      };

      const opts: Parameters<typeof jwtVerify>[2] = {
        issuer: ISS,
        audience: AUD,
        clockTolerance: TOL,
      };
      if (ALGS.length) (opts as any).algorithms = ALGS as any;

      const { payload, protectedHeader } = await jwtVerify(token, getKey, opts);

      const scope = Array.isArray((payload as any).scope)
        ? ((payload as any).scope as string[])
        : String((payload as any).scope || "")
            .split(" ")
            .filter((s) => !!s);

      return {
        id: String(payload.sub || ""),
        jti: String(payload.jti || ""),
        scope,
        payload,
        header: protectedHeader,
      };
    } catch (e: any) {
      try {
        const kids = await fetchJwksKids(JWKS_URL);
        const localKids = LOCAL_JWKS_RAW
          ? (JSON.parse(LOCAL_JWKS_RAW).keys || []).map((k: any) =>
              String(k.kid || "")
            )
          : [];
        logger.debug(
          {
            err: String(e),
            header: header || {},
            jwks_kids: kids,
            jwks_local_kids: localKids,
            jwks_url: JWKS_URL,
            issuer_expected: ISS,
            audience_expected: AUD,
            algorithms_allowed: ALGS,
          },
          "jwt.verify.failed"
        );
      } catch {}
      throw e;
    }
  }
}
