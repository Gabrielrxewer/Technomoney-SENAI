import "dotenv/config";
import jwt, { SignOptions, VerifyOptions, JwtPayload } from "jsonwebtoken";
import ms from "ms";
import { v4 as uuid } from "uuid";
import { keysService } from "./keys.service";

type AccessData = {
  id: string;
  jti: string;
  scope?: unknown;
  acr?: unknown;
  amr?: unknown;
};
type RefreshData = { id: string; jti: string };

const toSeconds = (v: unknown, fallback: number): number => {
  if (typeof v === "number" && Number.isFinite(v))
    return Math.max(0, Math.floor(v));
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return fallback;
    if (/^\d+$/.test(t)) return Math.max(0, parseInt(t, 10));
    const n = ms(t as any);
    if (typeof n === "number" && Number.isFinite(n))
      return Math.max(0, Math.floor(n / 1000));
  }
  return fallback;
};

export class JwtService {
  private issuer = process.env.JWT_ISSUER || "technomoney";
  private audienceSign = (process.env.JWT_AUDIENCE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  private audienceVerify = (process.env.JWT_AUDIENCE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  private expiresIn = toSeconds(process.env.JWT_EXPIRES_IN, 300);
  private refreshExpiresIn = toSeconds(
    process.env.JWT_REFRESH_EXPIRES_IN,
    28800
  );
  private clockTolerance = Number(process.env.JWT_CLOCK_TOLERANCE || 5);

  signAccess(id: string, extra: Record<string, unknown> = {}): string {
    const active = keysService.getActive();
    const payload = { id, jti: uuid(), typ: "access", ...extra };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      keyid: active.kid,
    };
    return jwt.sign(payload, active.privatePem, opts);
  }

  signRefresh(id: string): string {
    const active = keysService.getActive();
    const payload = { id, jti: uuid(), typ: "refresh" };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.refreshExpiresIn,
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      keyid: active.kid,
    };
    return jwt.sign(payload, active.privatePem, opts);
  }

  verifyAccess(token: string): AccessData {
    const decoded = jwt.decode(token, { complete: true }) as {
      header?: { kid?: string };
    } | null;
    const kid = decoded?.header?.kid;
    if (!kid) throw new Error("MISSING_KID");
    const entry = keysService.getByKid(kid);
    if (!entry) throw new Error("UNKNOWN_KID");
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
      audience: this.audienceVerify.length
        ? (this.audienceVerify as any)
        : undefined,
    };
    const d = jwt.verify(token, entry.publicPem, opts) as JwtPayload & {
      id: string;
      jti: string;
      typ: string;
      scope?: unknown;
      acr?: unknown;
      amr?: unknown;
    };
    if (d.typ !== "access") throw new Error("INVALID_TOKEN_TYPE");
    return { id: d.id, jti: d.jti, scope: d.scope, acr: d.acr, amr: d.amr };
  }

  verifyRefresh(token: string): RefreshData {
    const decoded = jwt.decode(token, { complete: true }) as {
      header?: { kid?: string };
    } | null;
    const kid = decoded?.header?.kid;
    if (!kid) throw new Error("MISSING_KID");
    const entry = keysService.getByKid(kid);
    if (!entry) throw new Error("UNKNOWN_KID");
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
      audience: this.audienceVerify.length
        ? (this.audienceVerify as any)
        : undefined,
    };
    const d = jwt.verify(token, entry.publicPem, opts) as JwtPayload & {
      id: string;
      jti: string;
      typ: string;
    };
    if (d.typ !== "refresh") throw new Error("INVALID_TOKEN_TYPE");
    return { id: d.id, jti: d.jti };
  }
}
