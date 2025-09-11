import crypto from "crypto";
import { Transaction } from "sequelize";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { logger } from "../utils/log/logger";

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
const hashRt = (t: string) =>
  crypto.createHash("sha256").update(t).digest("hex");

export class TokenService {
  private repo = new RefreshTokenRepository();

  async save(token: string, userId: string, tx?: Transaction) {
    const h = hashRt(token);
    logger.debug({ userId: mask(userId) }, "token.save.start");
    await this.repo.save(h, userId, tx);
    logger.debug({ userId: mask(userId) }, "token.save.ok");
  }

  async revoke(token: string, tx?: Transaction) {
    const h = hashRt(token);
    logger.debug({}, "token.revoke.start");
    await this.repo.revoke(h, tx);
    logger.debug({}, "token.revoke.ok");
  }

  async revokeAllForUser(userId: string, tx?: Transaction) {
    logger.debug({ userId: mask(userId) }, "token.revoke_all_for_user.start");
    await this.repo.revokeAllForUser(userId, tx);
    logger.debug({ userId: mask(userId) }, "token.revoke_all_for_user.ok");
  }

  async isValid(token: string) {
    const h = hashRt(token);
    logger.debug({}, "token.is_valid.start");
    const ok = !!(await this.repo.isValid(h));
    logger.debug({ ok, hashed: true }, "token.is_valid.result");
    return ok;
  }

  async wasIssued(token: string) {
    const h = hashRt(token);
    const a = await this.repo.wasIssued(h);
    return !!a;
  }
}
