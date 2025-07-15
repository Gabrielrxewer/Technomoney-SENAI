import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

export class JwtService {
  constructor(
    private readonly accessSecret = process.env.JWT_SECRET!,
    private readonly refreshSecret = process.env.JWT_REFRESH_SECRET!,
    private readonly accessExp = process.env.JWT_EXPIRES_IN || "15m",
    private readonly refreshExp = process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    private readonly issuer = "technomoney-auth"
  ) {}

  signAccess(id: string) {
    return jwt.sign({ id, jti: uuid(), iss: this.issuer }, this.accessSecret, {
      expiresIn: this.accessExp,
      algorithm: "HS256",
    });
  }

  signRefresh(id: string) {
    return jwt.sign({ id, jti: uuid(), iss: this.issuer }, this.refreshSecret, {
      expiresIn: this.refreshExp,
      algorithm: "HS256",
    });
  }

  verifyRefresh(token: string): { id: string; jti: string } {
    return jwt.verify(token, this.refreshSecret, {
      algorithms: ["HS256"],
    }) as any;
  }
}
