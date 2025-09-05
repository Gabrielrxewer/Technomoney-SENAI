import "dotenv/config";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { v4 as uuid } from "uuid";
import { keysService } from "./keys.service";

const parseExp = (v: string | number): number | StringValue =>
  typeof v === "number" ? v : (ms(v as StringValue) as number | StringValue);
const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;

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
  private expiresIn = parseExp(process.env.JWT_EXPIRES_IN || "5m");
  private refreshExpiresIn = parseExp(
    process.env.JWT_REFRESH_EXPIRES_IN || "8h"
  );
  private clockTolerance = Number(process.env.JWT_CLOCK_TOLERANCE || 5);

  signAccess(id: string, extra: Record<string, any> = {}) {
    const active = keysService.getActive();
    const payload: any = { id, jti: uuid(), typ: "access", ...extra };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audienceSign,
      keyid: active.kid,
    };
    const token = jwt.sign(payload, active.privatePem, opts);
    return token;
  }

  signRefresh(id: string) {
    const active = keysService.getActive();
    const payload: any = { id, jti: uuid(), typ: "refresh" };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.refreshExpiresIn,
      issuer: this.issuer,
      audience: this.audienceSign,
      keyid: active.kid,
    };
    const token = jwt.sign(payload, active.privatePem, opts);
    return token;
  }

  verifyAccess(token: string) {
    const decoded = jwt.decode(token, { complete: true }) as any;
    const kid =
      decoded && decoded.header && decoded.header.kid
        ? String(decoded.header.kid)
        : keysService.getActive().kid;
    const entry = keysService.getByKid(kid) || keysService.getActive();
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
    };
    if (this.audienceVerify.length) opts.audience = this.audienceVerify as any;
    const pub = entry.publicPem;
    const d = jwt.verify(token, pub, opts) as any;
    if (d.typ !== "access") throw new Error("INVALID_TOKEN_TYPE"); return { id: d.id, jti: d.jti, scope: d.scope, acr: d.acr, amr: d.amr };
  }

  verifyRefresh(token: string) {
    const decoded = jwt.decode(token, { complete: true }) as any;
    const kid =
      decoded && decoded.header && decoded.header.kid
        ? String(decoded.header.kid)
        : keysService.getActive().kid;
    const entry = keysService.getByKid(kid) || keysService.getActive();
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
    };
    if (this.audienceVerify.length) opts.audience = this.audienceVerify as any;
    const pub = entry.publicPem;
    const d = jwt.verify(token, pub, opts) as any;
    if (d.typ !== "access") throw new Error("INVALID_TOKEN_TYPE"); return { id: d.id, jti: d.jti, scope: d.scope, acr: d.acr, amr: d.amr };
  }
}
