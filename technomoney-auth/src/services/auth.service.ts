import jwt from "jsonwebtoken";
import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { AuthTokensDto, RefreshTokensDto } from "../types/auth.dto";
import { logger } from "../utils/logger";
import { sequelize } from "../models";
import { keysService } from "./keys.service";

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
const maskEmail = (e?: string) => {
  if (!e) return "";
  const [user, domain] = e.split("@");
  if (!domain) return mask(e);
  const u = user.length <= 2 ? "*" : `${user.slice(0, 2)}***`;
  return `${u}@${domain}`;
};
const getJti = (t: string) => {
  try {
    return ((jwt.decode(t) as any)?.jti as string) || "";
  } catch {
    return "";
  }
};

export class DomainError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export class AuthService {
  private users = new UserRepository();
  private jwt = new JwtService();
  private tokens = new TokenService();

  async register(
    email: string,
    password: string,
    username?: string
  ): Promise<AuthTokensDto> {
    logger.debug({ email: maskEmail(email), username }, "auth.register.start");
    if (await this.users.findByEmail(email)) {
      logger.warn({ email: maskEmail(email) }, "auth.register.email_taken");
      throw new DomainError("EMAIL_TAKEN", 409);
    }
    if (username && (await this.users.findByUsername(username))) {
      logger.warn({ username }, "auth.register.username_taken");
      throw new DomainError("USERNAME_TAKEN", 409);
    }
    const hashed = await hashPassword(password);
    const user = await this.users.create({ email, password: hashed, username });
    logger.debug(
      { userId: mask(user.id), username: user.username },
      "auth.register.created"
    );
    return this.issueTokens(user.id, user.username ?? null);
  }

  async login(email: string, password: string): Promise<AuthTokensDto> {
    logger.debug({ email: maskEmail(email) }, "auth.login.start");
    const user = await this.users.findByEmail(email);
    if (!user) {
      logger.warn({ email: maskEmail(email) }, "auth.login.not_found");
      throw new DomainError("NOT_FOUND", 404);
    }
    const storedHash = (user as any).password_hash as string;
    const ok = await comparePassword(password, storedHash);
    if (!ok) {
      logger.warn({ userId: mask(user.id) }, "auth.login.invalid_password");
      throw new DomainError("INVALID_PASSWORD", 401);
    }
    logger.debug(
      { userId: mask(user.id), username: user.username },
      "auth.login.ok"
    );
    return this.issueTokens(user.id, user.username ?? null);
  }

  async refresh(oldToken: string): Promise<RefreshTokensDto> {
    logger.debug({ oldJti: getJti(oldToken) }, "auth.refresh.start");
    let id = "";
    try {
      const v = this.jwt.verifyRefresh(oldToken);
      id = String(v.id || "");
    } catch {
      const stillValid = await this.tokens.isValid(oldToken);
      if (stillValid) {
        try {
          await this.tokens.revoke(oldToken);
        } catch (err) {
          logger.debug({ err }, "auth.refresh.revoke_failed");
        }
      }
      logger.warn({}, "auth.refresh.invalid");
      throw new DomainError("INVALID_REFRESH", 401);
    }
    const valid = await this.tokens.isValid(oldToken);
    if (!valid) {
      const issued = await this.tokens.wasIssued(oldToken);
      if (issued && id) {
        logger.warn({ userId: mask(id) }, "auth.refresh.reuse_detected");
        await this.tokens.revokeAllForUser(id);
        throw new DomainError("REFRESH_REUSE_DETECTED", 403);
      }
      logger.warn({}, "auth.refresh.invalid");
      throw new DomainError("INVALID_REFRESH", 401);
    }
    let access = "";
    let refresh = "";
    await sequelize.transaction(async (tx) => {
      refresh = this.jwt.signRefresh(id);
      await this.tokens.save(refresh, id, tx);
      await this.tokens.revoke(oldToken, tx);
      access = this.jwt.signAccess(id);
    });
    logger.debug(
      { userId: mask(id), oldJti: getJti(oldToken), newJti: getJti(refresh) },
      "auth.refresh.ok"
    );
    return { access, refresh };
  }

  async logout(refreshToken: string): Promise<void> {
    logger.debug({}, "auth.logout.start");
    await this.tokens.revoke(refreshToken);
    logger.debug({}, "auth.logout.ok");
  }

  private async issueTokens(
    id: string,
    username: string | null
  ): Promise<AuthTokensDto> {
    try {
      const { kid, alg } = keysService.getActive();
      logger.debug({ userId: mask(id), kid, alg }, "auth.issue_tokens.start");
      const access = this.jwt.signAccess(id);
      const refresh = this.jwt.signRefresh(id);
      await this.tokens.save(refresh, id);
      logger.debug({ userId: mask(id), kid, alg }, "auth.issue_tokens.ok");
      return { access, refresh, username };
    } catch (e: any) {
      logger.error({ err: e }, "ISSUE_TOKENS_FAILED");
      throw new DomainError("ISSUE_TOKENS_FAILED", 500);
    }
  }
}
