import type { JWSHeaderParameters, JWTPayload } from "jose";
import { joseImport } from "../utils/joseDynamic";

const ISS = process.env.AUTH_ISSUER as string;
const AUD = process.env.AUTH_AUDIENCE as string;
const TOL = Number(process.env.AUTH_CLOCK_TOLERANCE || "5");
const JWKS_URL = process.env.AUTH_JWKS_URL as string;

export class JwtVerifierService {
  async verifyAccess(
    token: string
  ): Promise<{
    id: string;
    jti: string;
    scope: string[];
    payload: JWTPayload;
    header: JWSHeaderParameters;
  }> {
    const { createRemoteJWKSet, jwtVerify } = await joseImport();
    const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      issuer: ISS,
      audience: AUD,
      clockTolerance: TOL,
    });
    return {
      id: String(payload.sub || ""),
      jti: String(payload.jti || ""),
      scope: (payload.scope as string[]) || [],
      payload,
      header: protectedHeader,
    };
  }
}
