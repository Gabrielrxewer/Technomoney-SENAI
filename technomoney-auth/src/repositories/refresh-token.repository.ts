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
}
