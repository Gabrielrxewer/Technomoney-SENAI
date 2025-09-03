import "dotenv/config";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";
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
    .filter(Boolean) as any;
  private accessExp = parseExp(process.env.JWT_EXPIRES_IN || "15m");
  private refreshExp = parseExp(process.env.JWT_REFRESH_EXPIRES_IN || "7d");
  private clockTolerance = Number(process.env.JWT_CLOCK_TOLERANCE || "5");

  signAccess(id: string, scope?: string): string {
    const key = keysService.getPrivate();
    const kid = keysService.getKid();
    const payload: any = { id, jti: uuid() };
    if (scope) payload.scope = scope;
    const opts: SignOptions = {
      algorithm: "RS256",
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      expiresIn: this.accessExp,
      keyid: kid,
    };
    const token = jwt.sign(payload, key, opts);
    logger.debug({ id: mask(id) }, "jwt.sign_access");
    return token;
  }

  signRefresh(id: string): string {
    const key = keysService.getPrivate();
    const kid = keysService.getKid();
    const payload = { id, jti: uuid() };
    const opts: SignOptions = {
      algorithm: "RS256",
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      expiresIn: this.refreshExp,
      keyid: kid,
    };
    const token = jwt.sign(payload, key, opts);
    logger.debug({ id: mask(id) }, "jwt.sign_refresh");
    return token;
  }

  verifyAccess(token: string): { id: string; jti: string; scope?: string } {
    const pub = keysService.getPublic();
    const opts: VerifyOptions = {
      algorithms: ["RS256"],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
    };
    if (this.audienceVerify.length) opts.audience = this.audienceVerify as any;
    const decoded = jwt.verify(token, pub, opts) as any;
    logger.debug(
      { id: mask(decoded?.id), jti: mask(decoded?.jti) },
      "jwt.verify_access"
    );
    return { id: decoded.id, jti: decoded.jti, scope: decoded.scope };
  }

  verifyRefresh(token: string): { id: string; jti: string } {
    const pub = keysService.getPublic();
    const opts: VerifyOptions = {
      algorithms: ["RS256"],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
    };
    if (this.audienceVerify.length) opts.audience = this.audienceVerify as any;
    const decoded = jwt.verify(token, pub, opts) as any;
    logger.debug(
      { id: mask(decoded?.id), jti: mask(decoded?.jti) },
      "jwt.verify_refresh"
    );
    return { id: decoded.id, jti: decoded.jti };
  }
}
