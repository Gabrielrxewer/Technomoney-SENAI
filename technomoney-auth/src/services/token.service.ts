import crypto from "crypto";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { logger } from "../utils/logger";

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
const hashRt = (t: string) =>
  crypto.createHash("sha256").update(t).digest("hex");

export class TokenService {
  private repo = new RefreshTokenRepository();

  async save(token: string, userId: string) {
    const h = hashRt(token);
    logger.debug({ userId: mask(userId) }, "token.save.start");
    await this.repo.save(h, userId);
    logger.debug({ userId: mask(userId) }, "token.save.ok");
  }

  async revoke(token: string) {
    const h = hashRt(token);
    logger.debug({}, "token.revoke.start");
    await this.repo.revoke(h);
    await this.repo.revoke(token);
    logger.debug({}, "token.revoke.ok");
  }

  async revokeAllForUser(userId: string) {
    logger.debug({ userId: mask(userId) }, "token.revoke_all_for_user.start");
    await this.repo.revokeAllForUser(userId);
    logger.debug({ userId: mask(userId) }, "token.revoke_all_for_user.ok");
  }

  async isValid(token: string) {
    const h = hashRt(token);
    logger.debug({}, "token.is_valid.start");
    const okHashed = !!(await this.repo.isValid(h));
    if (okHashed) {
      logger.debug({ ok: true, hashed: true }, "token.is_valid.result");
      return true;
    }
    const okPlain = !!(await this.repo.isValid(token));
    logger.debug({ ok: okPlain, hashed: false }, "token.is_valid.result");
    return okPlain;
  }

  async wasIssued(token: string) {
    const h = hashRt(token);
    const a = await this.repo.wasIssued(h);
    if (a) return true;
    return !!(await this.repo.wasIssued(token));
  }
}
