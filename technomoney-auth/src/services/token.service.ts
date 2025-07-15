import { RefreshTokenRepository } from "../repositories/refresh-token.repository";

export class TokenService {
  private repo = new RefreshTokenRepository();

  save(token: string, userId: string) {
    return this.repo.save(token, userId);
  }

  revoke(token: string) {
    return this.repo.revoke(token);
  }

  async isValid(token: string) {
    return !!(await this.repo.isValid(token));
  }
}
