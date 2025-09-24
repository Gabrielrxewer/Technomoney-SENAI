import { Transaction } from "sequelize";
import { Session } from "../models";

export class SessionRepository {
  create(
    sid: string,
    userId: string,
    refreshTokenHash: string,
    tx?: Transaction
  ) {
    return Session.upsert(
      {
        sid: sid.trim(),
        user_id: userId,
        refresh_token_hash: refreshTokenHash.trim(),
        revoked: false,
        revoked_at: null,
      },
      { transaction: tx }
    );
  }

  revokeByRefreshHash(refreshTokenHash: string, tx?: Transaction) {
    return Session.update(
      { revoked: true, revoked_at: new Date() },
      {
        where: {
          refresh_token_hash: refreshTokenHash.trim(),
          revoked: false,
        },
        transaction: tx,
      }
    );
  }

  revokeBySid(sid: string, tx?: Transaction) {
    return Session.update(
      { revoked: true, revoked_at: new Date() },
      { where: { sid: sid.trim(), revoked: false }, transaction: tx }
    );
  }

  revokeAllForUser(userId: string, tx?: Transaction) {
    return Session.update(
      { revoked: true, revoked_at: new Date() },
      { where: { user_id: userId, revoked: false }, transaction: tx }
    );
  }

  async isActive(sid: string) {
    const session = await Session.findOne({
      where: { sid: sid.trim(), revoked: false },
    });
    return !!session;
  }
}
