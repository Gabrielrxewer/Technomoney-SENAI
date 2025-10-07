import { Op, Transaction } from "sequelize";
import { EmailVerification } from "../models";

export class EmailVerificationRepository {
  create(
    data: {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Transaction
  ) {
    return EmailVerification.create(
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
    return EmailVerification.findByPk(id);
  }

  async confirm(id: string, tx?: Transaction) {
    return EmailVerification.update(
      { confirmed_at: new Date() },
      { where: { id }, transaction: tx }
    );
  }

  async invalidateAllForUser(userId: string, tx?: Transaction) {
    return EmailVerification.update(
      { confirmed_at: new Date() },
      {
        where: {
          user_id: userId,
          confirmed_at: { [Op.is]: null },
        },
        transaction: tx,
      }
    );
  }
}
