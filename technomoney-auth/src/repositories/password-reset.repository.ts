import { Op, Transaction } from "sequelize";
import { PasswordReset } from "../models";

export class PasswordResetRepository {
  create(
    data: {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Transaction
  ) {
    return PasswordReset.create(
      {
        id: data.id,
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      },
      { transaction: tx }
    );
  }

  findById(id: string) {
    return PasswordReset.findByPk(id);
  }

  async markUsed(id: string, tx?: Transaction) {
    return PasswordReset.update(
      { used_at: new Date() },
      { where: { id }, transaction: tx }
    );
  }

  async invalidateAllForUser(userId: string, tx?: Transaction) {
    return PasswordReset.update(
      { used_at: new Date() },
      {
        where: {
          user_id: userId,
          used_at: { [Op.is]: null },
        },
        transaction: tx,
      }
    );
  }
}
