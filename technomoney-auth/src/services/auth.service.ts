import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { AuthTokensDto } from "../types/auth.dto";
import { logger } from "../utils/logger";
import { validatePassword } from "../utils/passwordPolicy.util";

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
    if (!validatePassword(password)) {
      logger.warn({ email: maskEmail(email) }, "auth.register.weak_password");
      throw new Error("WEAK_PASSWORD");
    }
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
    return this.issueTokens(user.id, user.username);
  }

  async login(email: string, password: string): Promise<AuthTokensDto> {
    logger.debug({ email: maskEmail(email) }, "auth.login.start");
    const user = await this.users.findByEmail(email);
    if (!user) {
      logger.warn({ email: maskEmail(email) }, "auth.login.not_found");
      throw new Error("NOT_FOUND");
    }
    const ok = await comparePassword(password, (user as any).password_hash);
    if (!ok) {
      logger.warn({ userId: mask(user.id) }, "auth.login.invalid_password");
      throw new Error("INVALID_PASSWORD");
    }
    logger.debug(
      { userId: mask(user.id), username: user.username },
      "auth.login.ok"
    );
    return this.issueTokens(user.id, user.username);
  }

  async refresh(oldToken: string) {
    logger.debug({}, "auth.refresh.start");
    const valid = await this.tokens.isValid(oldToken);
    const { id } = this.jwt.verifyRefresh(oldToken);
    if (!valid) {
      const issued = await this.tokens.wasIssued(oldToken);
      if (issued) {
        logger.warn({ userId: mask(id) }, "auth.refresh.reuse_detected");
        await this.tokens.revokeAllForUser(id);
        throw new Error("REFRESH_REUSE_DETECTED");
      }
      logger.warn({}, "auth.refresh.invalid");
      throw new Error("INVALID_REFRESH");
    }
    const newRefresh = this.jwt.signRefresh(id);
    await this.tokens.save(newRefresh, id);
    await this.tokens.revoke(oldToken);
    const access = this.jwt.signAccess(id);
    logger.debug({ userId: mask(id) }, "auth.refresh.ok");
    return { access, newRefresh };
  }

  async logout(refreshToken: string) {
    logger.debug({}, "auth.logout.start");
    await this.tokens.revoke(refreshToken);
    logger.debug({}, "auth.logout.ok");
  }

  private async issueTokens(id: string, username: string | null) {
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
