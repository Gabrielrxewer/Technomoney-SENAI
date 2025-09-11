import { getLogger } from "../utils/log/logger";
import {
  mask,
  maskEmail,
  maskJti,
  getJti,
  safeErr,
} from "../utils/log/log.helpers";
import { getLogContext } from "../utils/log/logging-context";
import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { AuthTokensDto, RefreshTokensDto } from "../types/auth.dto";
import { sequelize } from "../models";
import { keysService } from "./keys.service";

type RefreshPayload = {
  sub?: string;
  jti?: string;
  id?: string;
  iss?: string;
  aud?: string;
  iat: number;
  exp: number;
};
type IUser = { id: string; username: string | null; password_hash: string };

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

  private log(bindings?: Record<string, unknown>) {
    return getLogger({
      svc: "AuthService",
      ...getLogContext(),
      ...(bindings || {}),
    });
  }

  async register(
    email: string,
    password: string,
    username?: string
  ): Promise<AuthTokensDto> {
    const log = this.log();
    log.debug({
      evt: "auth.register.start",
      email: maskEmail(email),
      username,
    });
    const existsByEmail = await this.users.findByEmail(email);
    if (existsByEmail) {
      log.warn({ evt: "auth.register.email_taken", email: maskEmail(email) });
      throw new DomainError("EMAIL_TAKEN", 409);
    }
    if (username && (await this.users.findByUsername(username))) {
      log.warn({ evt: "auth.register.username_taken", username });
      throw new DomainError("USERNAME_TAKEN", 409);
    }
    const hashed = await hashPassword(password);
    const user = (await this.users.create({
      email,
      password: hashed,
      username,
    })) as unknown as IUser;
    log.debug({
      evt: "auth.register.created",
      userId: mask(user.id),
      username: user.username,
    });
    return this.issueTokens(user.id, user.username ?? null);
  }

  async login(email: string, password: string): Promise<AuthTokensDto> {
    const log = this.log();
    log.debug({ evt: "auth.login.start", email: maskEmail(email) });
    const user = (await this.users.findByEmail(email)) as IUser | null;
    if (!user) {
      log.warn({
        evt: "auth.login.invalid_credentials",
        email: maskEmail(email),
      });
      throw new DomainError("INVALID_CREDENTIALS", 401);
    }
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      log.warn({
        evt: "auth.login.invalid_credentials",
        userId: mask(user.id),
      });
      throw new DomainError("INVALID_CREDENTIALS", 401);
    }
    log.debug({
      evt: "auth.login.ok",
      userId: mask(user.id),
      username: user.username,
    });
    return this.issueTokens(user.id, user.username ?? null);
  }

  async refresh(oldToken: string): Promise<RefreshTokensDto> {
    const log = this.log();
    log.debug({ evt: "auth.refresh.start", oldJti: maskJti(getJti(oldToken)) });
    let id = "";
    try {
      const v = this.jwt.verifyRefresh(oldToken) as RefreshPayload;
      id = String(v.sub || v.id || "");
    } catch {
      const stillValid = await this.tokens.isValid(oldToken);
      if (stillValid) {
        try {
          await this.tokens.revoke(oldToken);
        } catch (err) {
          log.debug({ evt: "auth.refresh.revoke_failed", err: safeErr(err) });
        }
      }
      log.warn({ evt: "auth.refresh.invalid" });
      throw new DomainError("INVALID_REFRESH", 401);
    }
    const valid = await this.tokens.isValid(oldToken);
    if (!valid) {
      const issued = await this.tokens.wasIssued(oldToken);
      if (issued && id) {
        log.warn({ evt: "auth.refresh.reuse_detected", userId: mask(id) });
        await this.tokens.revokeAllForUser(id);
        throw new DomainError("REFRESH_REUSE_DETECTED", 403);
      }
      log.warn({ evt: "auth.refresh.invalid" });
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
    log.debug({
      evt: "auth.refresh.ok",
      userId: mask(id),
      oldJti: maskJti(getJti(oldToken)),
      newJti: maskJti(getJti(refresh)),
    });
    return { access, refresh };
  }

  async logout(refreshToken: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.logout.start" });
    await this.tokens.revoke(refreshToken);
    log.debug({ evt: "auth.logout.ok" });
  }

  private async issueTokens(
    id: string,
    username: string | null
  ): Promise<AuthTokensDto> {
    const log = this.log({ userId: mask(id) });
    try {
      const { kid, alg } = keysService.getActive();
      log.debug({ evt: "auth.issue_tokens.start", kid, alg });
      const access = this.jwt.signAccess(id);
      const refresh = this.jwt.signRefresh(id);
      await this.tokens.save(refresh, id);
      log.debug({ evt: "auth.issue_tokens.ok", kid, alg });
      return { access, refresh, username };
    } catch (e: any) {
      log.error({ evt: "auth.issue_tokens.failed", err: safeErr(e) });
      throw new DomainError("ISSUE_TOKENS_FAILED", 500);
    }
  }
}
