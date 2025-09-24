import { randomUUID } from "crypto";
import { getLogger } from "../utils/log/logger";
import {
  mask,
  maskEmail,
  maskJti,
  getJti,
  safeErr,
} from "../utils/log/log.helpers";
import { getLogContext } from "../utils/log/logging-context";
import { audit } from "../utils/log/audit-logger";
import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { PasswordResetRepository } from "../repositories/password-reset.repository";
import { EmailVerificationRepository } from "../repositories/email-verification.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { SessionService } from "./session.service";
import { EmailService } from "./email.service";
import {
  AuthTokensDto,
  RefreshTokensDto,
  StepUpTokenDto,
  LoginResult,
} from "../types/auth.dto";
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
type IUser = {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  email_verified: boolean;
};

type AuthServiceDeps = {
  userRepository?: UserRepository;
  passwordResetRepository?: PasswordResetRepository;
  emailVerificationRepository?: EmailVerificationRepository;
  emailService?: EmailService;
  tokenService?: TokenService;
  sessionService?: SessionService;
  jwtService?: JwtService;
  now?: () => Date;
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
  private users: UserRepository;
  private jwt: JwtService;
  private tokens: TokenService;
  private sessions: SessionService;
  private passwordResets: PasswordResetRepository;
  private emailVerifications: EmailVerificationRepository;
  private emails: EmailService;
  private now: () => Date;

  constructor(deps: AuthServiceDeps = {}) {
    this.users = deps.userRepository ?? new UserRepository();
    this.jwt = deps.jwtService ?? new JwtService();
    this.tokens = deps.tokenService ?? new TokenService();
    this.sessions = deps.sessionService ?? new SessionService();
    this.passwordResets =
      deps.passwordResetRepository ?? new PasswordResetRepository();
    this.emailVerifications =
      deps.emailVerificationRepository ?? new EmailVerificationRepository();
    this.emails = deps.emailService ?? new EmailService();
    this.now = deps.now ?? (() => new Date());
  }

  private log(bindings?: Record<string, unknown>) {
    return getLogger({
      svc: "AuthService",
      ...getLogContext(),
      ...(bindings || {}),
    });
  }

  private clampTtl(raw: number, fallback: number): number {
    if (!Number.isFinite(raw) || raw <= 0) {
      return fallback;
    }
    return Math.min(raw, 3600);
  }

  private resetTtlSeconds(): number {
    const raw = Number(process.env.RESET_TOKEN_TTL ?? "");
    return this.clampTtl(raw, 900);
  }

  private verificationTtlSeconds(): number {
    const raw = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL ?? "");
    return this.clampTtl(raw, 1800);
  }

  private requireEmailVerification(): boolean {
    const raw = process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
    if (typeof raw !== "string") {
      return false;
    }
    const normalized = raw.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return ["1", "true", "yes", "on"].includes(normalized);
  }

  private buildActionLink(base: string | undefined, token: string): string {
    if (!base) {
      return token;
    }
    try {
      const url = new URL(base);
      url.searchParams.set("token", token);
      return url.toString();
    } catch {
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  private parseCompositeToken(token: string): { id: string; secret: string } {
    if (typeof token !== "string") {
      throw new DomainError("INVALID_TOKEN", 400);
    }
    const [id, secret] = token.split(".");
    if (!id || !secret) {
      throw new DomainError("INVALID_TOKEN", 400);
    }
    return { id, secret };
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
    return this.createSession(user.id, user.username ?? null);
  }

  async login(email: string, password: string): Promise<LoginResult> {
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
    if (this.requireEmailVerification() && !user.email_verified) {
      log.warn({
        evt: "auth.login.email_not_verified",
        userId: mask(user.id),
      });
      throw new DomainError("EMAIL_NOT_VERIFIED", 403);
    }
    log.debug({
      evt: "auth.login.ok",
      userId: mask(user.id),
      username: user.username,
    });
    return { id: user.id, username: user.username ?? null };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.reset.request.start", email: maskEmail(email) });
    const user = (await this.users.findByEmail(email)) as IUser | null;
    if (!user) {
      log.debug({ evt: "auth.reset.request.unknown_email" });
      return;
    }
    const ttl = this.resetTtlSeconds();
    const expiresAt = new Date(this.now().getTime() + ttl * 1000);
    const tokenId = randomUUID();
    const secret = randomUUID();
    const hashed = await hashPassword(secret);
    await sequelize.transaction(async (tx) => {
      await this.passwordResets.invalidateAllForUser(user.id, tx);
      await this.passwordResets.create(
        { id: tokenId, userId: user.id, tokenHash: hashed, expiresAt },
        tx
      );
    });
    const link = this.buildActionLink(
      process.env.PASSWORD_RESET_URL,
      `${tokenId}.${secret}`
    );
    await this.emails.sendPasswordReset(user.email, link, expiresAt);
    log.debug({
      evt: "auth.reset.request.ok",
      userId: mask(user.id),
      resetId: mask(tokenId),
      ttl,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.reset.confirm.start" });
    const { id, secret } = this.parseCompositeToken(token);
    const record = await this.passwordResets.findById(id);
    if (!record) {
      log.warn({ evt: "auth.reset.confirm.unknown" });
      throw new DomainError("INVALID_TOKEN", 400);
    }
    if (record.used_at) {
      log.warn({ evt: "auth.reset.confirm.used", userId: mask(record.user_id) });
      throw new DomainError("TOKEN_ALREADY_USED", 400);
    }
    if (record.expires_at.getTime() <= this.now().getTime()) {
      log.warn({ evt: "auth.reset.confirm.expired", userId: mask(record.user_id) });
      throw new DomainError("TOKEN_EXPIRED", 400);
    }
    const ok = await comparePassword(secret, record.token_hash);
    if (!ok) {
      log.warn({ evt: "auth.reset.confirm.invalid_secret" });
      throw new DomainError("INVALID_TOKEN", 400);
    }
    const hashedPassword = await hashPassword(password);
    await sequelize.transaction(async (tx) => {
      await this.passwordResets.markUsed(id, tx);
      await this.users.updatePassword(record.user_id, hashedPassword, tx);
      await this.tokens.revokeAllForUser(record.user_id, tx);
      await this.sessions.revokeAllForUser(record.user_id, tx);
    });
    log.debug({ evt: "auth.reset.confirm.ok", userId: mask(record.user_id) });
  }

  async requestEmailVerification(email: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.verify.request.start", email: maskEmail(email) });
    const user = (await this.users.findByEmail(email)) as IUser | null;
    if (!user) {
      log.debug({ evt: "auth.verify.request.unknown_email" });
      return;
    }
    if (user.email_verified) {
      log.debug({ evt: "auth.verify.request.already_verified" });
      return;
    }
    const ttl = this.verificationTtlSeconds();
    const expiresAt = new Date(this.now().getTime() + ttl * 1000);
    const tokenId = randomUUID();
    const secret = randomUUID();
    const hashed = await hashPassword(secret);
    await sequelize.transaction(async (tx) => {
      await this.emailVerifications.invalidateAllForUser(user.id, tx);
      await this.emailVerifications.create(
        { id: tokenId, userId: user.id, tokenHash: hashed, expiresAt },
        tx
      );
    });
    const link = this.buildActionLink(
      process.env.EMAIL_VERIFICATION_URL,
      `${tokenId}.${secret}`
    );
    await this.emails.sendEmailVerification(user.email, link, expiresAt);
    log.debug({
      evt: "auth.verify.request.ok",
      userId: mask(user.id),
      verificationId: mask(tokenId),
      ttl,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.verify.confirm.start" });
    const { id, secret } = this.parseCompositeToken(token);
    const record = await this.emailVerifications.findById(id);
    if (!record) {
      log.warn({ evt: "auth.verify.confirm.unknown" });
      throw new DomainError("INVALID_TOKEN", 400);
    }
    if (record.confirmed_at) {
      log.warn({ evt: "auth.verify.confirm.used", userId: mask(record.user_id) });
      throw new DomainError("TOKEN_ALREADY_USED", 400);
    }
    if (record.expires_at.getTime() <= this.now().getTime()) {
      log.warn({ evt: "auth.verify.confirm.expired", userId: mask(record.user_id) });
      throw new DomainError("TOKEN_EXPIRED", 400);
    }
    const ok = await comparePassword(secret, record.token_hash);
    if (!ok) {
      log.warn({ evt: "auth.verify.confirm.invalid_secret" });
      throw new DomainError("INVALID_TOKEN", 400);
    }
    await sequelize.transaction(async (tx) => {
      await this.emailVerifications.confirm(id, tx);
      await this.users.markEmailVerified(record.user_id, tx);
    });
    log.debug({ evt: "auth.verify.confirm.ok", userId: mask(record.user_id) });
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
          await this.sessions.revokeByRefreshToken(oldToken);
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
        log.error({ evt: "auth.refresh.reuse_detected", userId: mask(id) });
        audit({ userId: mask(id) }).error({
          evt: "auth.refresh.reuse_detected",
          oldJti: maskJti(getJti(oldToken)),
        });
        await this.sessions.revokeAllForUser(id);
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
      const sid = await this.sessions.start(id, refresh, tx);
      await this.tokens.save(refresh, id, tx);
      await this.sessions.revokeByRefreshToken(oldToken, tx);
      await this.tokens.revoke(oldToken, tx);
      access = this.jwt.signAccess(id, { sid });
    });
    const bindings = {
      evt: "auth.refresh.ok",
      userId: mask(id),
      oldJti: maskJti(getJti(oldToken)),
      newJti: maskJti(getJti(refresh)),
    };
    log.info(bindings);
    audit({ userId: mask(id) }).info(bindings);
    return { access, refresh };
  }

  async logout(refreshToken: string): Promise<void> {
    const log = this.log();
    log.debug({ evt: "auth.logout.start" });
    await this.sessions.revokeByRefreshToken(refreshToken);
    await this.tokens.revoke(refreshToken);
    log.debug({ evt: "auth.logout.ok" });
  }

  async createSession(
    id: string,
    username: string | null,
    extra: Record<string, unknown> = {}
  ): Promise<AuthTokensDto> {
    const log = this.log({ userId: mask(id) });
    try {
      const { kid, alg } = keysService.getActive();
      log.debug({ evt: "auth.issue_tokens.start", kid, alg });
      const payload: Record<string, unknown> = { ...extra };
      if (typeof username === "string" && username.length > 0) {
        payload.username = username;
        payload.preferred_username = username;
      }
      const refresh = this.jwt.signRefresh(id);
      let sid = "";
      await sequelize.transaction(async (tx) => {
        sid = await this.sessions.start(id, refresh, tx);
        await this.tokens.save(refresh, id, tx);
      });
      const access = this.jwt.signAccess(id, { ...payload, sid });
      log.debug({ evt: "auth.issue_tokens.ok", kid, alg });
      return { access, refresh, username };
    } catch (e: any) {
      log.error(e, { evt: "auth.issue_tokens.failed", err: safeErr(e) });
      throw new DomainError("ISSUE_TOKENS_FAILED", 500);
    }
  }

  async issueStepUpToken(
    id: string,
    username: string | null,
    extra: Record<string, unknown> = {}
  ): Promise<StepUpTokenDto> {
    const log = this.log({ userId: mask(id) });
    try {
      const { kid, alg } = keysService.getActive();
      log.debug({ evt: "auth.issue_stepup.start", kid, alg });
      const payload: Record<string, unknown> = {
        scope: ["auth:stepup"],
        acr: "step-up",
        amr: ["pwd"],
        ...extra,
      };
      if (typeof username === "string" && username.length > 0) {
        payload.username = username;
        payload.preferred_username = username;
      }
      const token = this.jwt.signAccess(id, payload);
      log.debug({ evt: "auth.issue_stepup.ok", kid, alg });
      return { token, acr: "step-up", scope: ["auth:stepup"], username };
    } catch (e: any) {
      log.error(e, { evt: "auth.issue_stepup.failed", err: safeErr(e) });
      throw new DomainError("ISSUE_TOKENS_FAILED", 500);
    }
  }
}
