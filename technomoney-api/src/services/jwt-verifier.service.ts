import { logger } from "../utils/logger";

type JWTPayload = import("jose").JWTPayload;
type Jose = typeof import("jose");

let josePromise: Promise<Jose> | null = null;
const dynImport = new Function("m", "return import(m)") as (
  m: string
) => Promise<any>;
const loadJose = () => (josePromise ??= dynImport("jose") as Promise<Jose>);

const parseAudienceVerify = (v?: string) => {
  if (!v) return undefined;
  const arr = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? (arr as any) : undefined;
};

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;

const jwksUrl = process.env.AUTH_JWKS_URL || "";
const issuer = process.env.AUTH_ISSUER || "technomoney";
const audience = parseAudienceVerify(process.env.AUTH_AUDIENCE);
const clockTolerance = Number(process.env.AUTH_CLOCK_TOLERANCE || "5");

let jwks: any;

const getJWKS = async () => {
  if (jwks) return jwks;
  if (!jwksUrl) throw new Error("AUTH_JWKS_URL missing");
  const { createRemoteJWKSet } = await loadJose();
  jwks = createRemoteJWKSet(new URL(jwksUrl), {
    cooldownDuration: 60000,
    cacheMaxAge: 600000,
  });
  logger.debug({ jwksUrl }, "jwt.jwks.init");
  return jwks;
};

export class JwtVerifierService {
  async verifyAccess(
    token: string
  ): Promise<{ id: string; jti: string; scope: string; payload: JWTPayload }> {
    const { jwtVerify } = await loadJose();
    const keySet = await getJWKS();
    const options: any = { algorithms: ["RS256"], issuer, clockTolerance };
    if (audience) options.audience = audience;
    const res = await jwtVerify(token, keySet, options);
    const id = String((res.payload as any).id || res.payload.sub || "");
    const jti = String(res.payload.jti || "");
    const scope = String((res.payload as any).scope || "");
    logger.debug({ id: mask(id), jti: mask(jti) }, "jwt.verify_access.ok");
    return { id, jti, scope, payload: res.payload };
  }
}
