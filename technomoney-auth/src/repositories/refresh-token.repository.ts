import { Transaction } from "sequelize";
import { RefreshToken } from "../models";

export class RefreshTokenRepository {
  save(tokenHash: string, userId: string, tx?: Transaction) {
    return RefreshToken.create(
      { token: tokenHash.trim(), user_id: userId, revoked: false },
      { transaction: tx }
    );
  }

  revoke(tokenHash: string, tx?: Transaction) {
    return RefreshToken.update(
      { revoked: true },
      { where: { token: tokenHash.trim(), revoked: false }, transaction: tx }
    );
  }

  isValid(tokenHash: string) {
    return RefreshToken.findOne({
      where: { token: tokenHash.trim(), revoked: false },
    });
  }

  wasIssued(tokenHash: string) {
    return RefreshToken.findOne({
      where: { token: tokenHash.trim() },
    });
  }

  revokeAllForUser(userId: string, tx?: Transaction) {
    return RefreshToken.update(
      { revoked: true },
      { where: { user_id: userId, revoked: false }, transaction: tx }
    );
  }
}
