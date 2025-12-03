import { Transaction, Op, fn, col, literal } from "sequelize";
import { Session } from "../models";

export interface SessionDailyCount {
  day: string;
  created: number;
  revoked: number;
}

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

  async getDailyAccessCounts(start: Date, end: Date): Promise<SessionDailyCount[]> {
    const dayTrunc = fn("date_trunc", "day", col("created_at"));
    const rows = await Session.findAll({
      attributes: [
        [dayTrunc, "day"],
        [fn("COUNT", col("sid")), "created"],
        [fn("SUM", literal("CASE WHEN revoked THEN 1 ELSE 0 END")), "revoked"],
      ],
      where: { created_at: { [Op.gte]: start, [Op.lt]: end } },
      group: [dayTrunc],
      order: [[dayTrunc, "ASC"]],
      raw: true,
    });

    return rows.map((row: any) => ({
      day: new Date(row.day).toISOString().slice(0, 10),
      created: Number(row.created) || 0,
      revoked: Number(row.revoked) || 0,
    }));
  }
}
