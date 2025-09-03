import "dotenv/config";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";

const parseExp = (v: string | number): number | StringValue =>
  typeof v === "number" ? v : (ms(v as StringValue) as number | StringValue);
const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;

const parseAudienceBoth = (
  v?: string
): {
  sign?: string | string[];
  verify?: string | [string | RegExp, ...(string | RegExp)[]];
} => {
  if (!v) return {};
  const t = v.trim();
  if (!t) return {};
  const parts = t.includes(",")
    ? t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [t];
  if (parts.length === 1) return { sign: parts[0], verify: parts[0] };
  const tuple = [parts[0], ...parts.slice(1)] as [string, ...string[]];
  return { sign: parts, verify: tuple };
};

export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExp: number | StringValue;
  private readonly refreshExp: number | StringValue;
  private readonly issuer: string;
  private readonly audienceSign?: string | string[];
  private readonly audienceVerify?:
    | string
    | [string | RegExp, ...(string | RegExp)[]];

  constructor() {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      logger.error({}, "jwt.config_invalid");
      throw new Error("JWT_CONFIG_INVALID");
    }
    this.accessSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExp = parseExp(process.env.JWT_EXPIRES_IN || "15m");
    this.refreshExp = parseExp(process.env.JWT_REFRESH_EXPIRES_IN || "7d");
    this.issuer = "technomoney-auth";
    const aud = parseAudienceBoth(process.env.JWT_AUDIENCE);
    this.audienceSign = aud.sign;
    this.audienceVerify = aud.verify;
    logger.debug(
      {
        issuer: this.issuer,
        aud: Array.isArray(this.audienceSign)
          ? this.audienceSign.join(",")
          : this.audienceSign || "",
      },
      "jwt.service.init"
    );
  }

  signAccess(id: string) {
    const jti = uuid();
    const opts: SignOptions = {
      expiresIn: this.accessExp,
      algorithm: "HS256",
      issuer: this.issuer,
      jwtid: jti,
    };
    if (this.audienceSign) opts.audience = this.audienceSign;
    const token = jwt.sign({ id }, this.accessSecret, opts);
    logger.debug({ userId: mask(id), jti: mask(jti) }, "jwt.sign_access");
    return token;
  }

  signRefresh(id: string) {
    const jti = uuid();
    const opts: SignOptions = {
      expiresIn: this.refreshExp,
      algorithm: "HS256",
      issuer: this.issuer,
      jwtid: jti,
    };
    if (this.audienceSign) opts.audience = this.audienceSign;
    const token = jwt.sign({ id }, this.refreshSecret, opts);
    logger.debug({ userId: mask(id), jti: mask(jti) }, "jwt.sign_refresh");
    return token;
  }

  verifyRefresh(token: string): { id: string; jti: string } {
    const opts: VerifyOptions = { algorithms: ["HS256"], issuer: this.issuer };
    if (this.audienceVerify) opts.audience = this.audienceVerify;
    const decoded = jwt.verify(token, this.refreshSecret, opts) as any;
    logger.debug(
      { userId: mask(decoded?.id), jti: mask(decoded?.jti) },
      "jwt.verify_refresh"
    );
    return { id: decoded.id, jti: decoded.jti };
  }
}
