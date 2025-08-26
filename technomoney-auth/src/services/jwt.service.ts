import jwt, { SignOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { v4 as uuid } from "uuid";

const parseExp = (v: string | number): number | StringValue =>
  typeof v === "number" ? v : (ms(v as StringValue) as number | StringValue);

export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExp: number | StringValue;
  private readonly refreshExp: number | StringValue;
  private readonly issuer: string;

  constructor() {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT_CONFIG_INVALID");
    }
    this.accessSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExp = parseExp(process.env.JWT_EXPIRES_IN || "15m");
    this.refreshExp = parseExp(process.env.JWT_REFRESH_EXPIRES_IN || "7d");
    this.issuer = "technomoney-auth";
  }

  signAccess(id: string) {
    const opts: SignOptions = {
      expiresIn: this.accessExp,
      algorithm: "HS256",
      issuer: this.issuer,
      jwtid: uuid(),
    };
    return jwt.sign({ id }, this.accessSecret, opts);
  }

  signRefresh(id: string) {
    const opts: SignOptions = {
      expiresIn: this.refreshExp,
      algorithm: "HS256",
      issuer: this.issuer,
      jwtid: uuid(),
    };
    return jwt.sign({ id }, this.refreshSecret, opts);
  }

  verifyRefresh(token: string): { id: string; jti: string } {
    const decoded = jwt.verify(token, this.refreshSecret, {
      algorithms: ["HS256"],
      issuer: this.issuer,
    }) as any;
    return { id: decoded.id, jti: decoded.jti };
  }
}
