import { RefreshToken } from "../models";

export class RefreshTokenRepository {
  save(token: string, userId: string) {
    return RefreshToken.create({
      token: token.trim(),
      user_id: userId,
      revoked: false,
    });
  }

  async revoke(token: string) {
    const rec = await RefreshToken.findOne({ where: { token: token.trim() } });
    if (rec) {
      rec.revoked = true;
      await rec.save();
    }
  }

  isValid(token: string) {
    return RefreshToken.findOne({
      where: { token: token.trim(), revoked: false },
    });
  }

  wasIssued(token: string) {
    return RefreshToken.findOne({
      where: { token: token.trim() },
    });
  }

  async revokeAllForUser(userId: string) {
    const recs = await RefreshToken.findAll({
      where: { user_id: userId, revoked: false },
    });
    for (const r of recs) {
      r.revoked = true;
      await r.save();
    }
  }
}
