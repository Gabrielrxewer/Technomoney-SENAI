import { Transaction } from "sequelize";
import { SessionRepository } from "../repositories/session.repository";
import { deriveSid, hashRefreshToken } from "../utils/session.util";

export class SessionService {
  private repo = new SessionRepository();

  async start(userId: string, refreshToken: string, tx?: Transaction) {
    const sid = deriveSid(refreshToken);
    const refreshHash = hashRefreshToken(refreshToken);
    await this.repo.create(sid, userId, refreshHash, tx);
    return sid;
  }

  async revokeByRefreshToken(refreshToken: string, tx?: Transaction) {
    const refreshHash = hashRefreshToken(refreshToken);
    await this.repo.revokeByRefreshHash(refreshHash, tx);
  }

  async revokeAllForUser(userId: string, tx?: Transaction) {
    await this.repo.revokeAllForUser(userId, tx);
  }

  isActive(sid: string) {
    return this.repo.isActive(sid);
  }
}
