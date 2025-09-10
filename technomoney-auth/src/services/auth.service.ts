import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { AuthTokensDto, RefreshTokensDto } from "../types/auth.dto";
import { logger } from "../utils/logger";
import { sequelize } from "../models";

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
const maskEmail = (e?: string) => {
  if (!e) return "";
  const [user, domain] = e.split("@");
  if (!domain) return mask(e);
  const u = user.length <= 2 ? "*" : `${user.slice(0, 2)}***`;
  return `${u}@${domain}`;
};

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
      throw new Error("EMAIL_TAKEN");
    }
    if (username && (await this.users.findByUsername(username))) {
      logger.warn({ username }, "auth.register.username_taken");
      throw new Error("USERNAME_TAKEN");
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
      throw new Error("NOT_FOUND");
    }
    const storedHash =
      (user as any).password_hash ?? (user as any).password ?? "";
    const ok = await comparePassword(password, storedHash);
    if (!ok) {
      logger.warn({ userId: mask(user.id) }, "auth.login.invalid_password");
      throw new Error("INVALID_PASSWORD");
    }
    logger.debug(
      { userId: mask(user.id), username: user.username },
      "auth.login.ok"
    );
    return this.issueTokens(user.id, user.username ?? null);
  }

  async refresh(oldToken: string): Promise<RefreshTokensDto> {
    logger.debug({}, "auth.refresh.start");
    let id = "";
    try {
      const v = this.jwt.verifyRefresh(oldToken);
      id = String(v.id || "");
    } catch {
      const stillValid = await this.tokens.isValid(oldToken);
      if (stillValid) {
        try {
          await this.tokens.revoke(oldToken);
        } catch {}
      }
      logger.warn({}, "auth.refresh.invalid");
      throw new Error("INVALID_REFRESH");
    }
    const valid = await this.tokens.isValid(oldToken);
    if (!valid) {
      const issued = await this.tokens.wasIssued(oldToken);
      if (issued && id) {
        logger.warn({ userId: mask(id) }, "auth.refresh.reuse_detected");
        await this.tokens.revokeAllForUser(id);
        throw new Error("REFRESH_REUSE_DETECTED");
      }
      logger.warn({}, "auth.refresh.invalid");
      throw new Error("INVALID_REFRESH");
    }
    let access = "";
    let refresh = "";
    await sequelize.transaction(async (tx) => {
      refresh = this.jwt.signRefresh(id);
      await this.tokens.save(refresh, id, tx);
      await this.tokens.revoke(oldToken, tx);
      access = this.jwt.signAccess(id);
    });
    logger.debug({ userId: mask(id) }, "auth.refresh.ok");
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
      logger.debug({ userId: mask(id) }, "auth.issue_tokens.start");
      const access = this.jwt.signAccess(id);
      const refresh = this.jwt.signRefresh(id);
      await this.tokens.save(refresh, id);
      logger.debug({ userId: mask(id) }, "auth.issue_tokens.ok");
      return { access, refresh, username };
    } catch (e: any) {
      logger.error({ err: e }, "ISSUE_TOKENS_FAILED");
      throw new Error("ISSUE_TOKENS_FAILED");
    }
  }
}
