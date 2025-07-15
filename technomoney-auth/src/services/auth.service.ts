import { hashPassword, comparePassword } from "../utils/password.util";
import { UserRepository } from "../repositories/user.repository";
import { JwtService } from "./jwt.service";
import { TokenService } from "./token.service";
import { AuthTokensDto } from "../types/auth.dto";

export class AuthService {
  private users = new UserRepository();
  private jwt = new JwtService();
  private tokens = new TokenService();

  /* ---------- REGISTER ---------- */
  async register(
    email: string,
    password: string,
    username?: string
  ): Promise<AuthTokensDto> {
    if (await this.users.findByEmail(email)) throw new Error("EMAIL_TAKEN");
    if (username && (await this.users.findByUsername(username)))
      throw new Error("USERNAME_TAKEN");

    const hashed = await hashPassword(password);
    const user = await this.users.create({ email, password: hashed, username });
    return this.issueTokens(user.id, user.username);
  }

  /* ---------- LOGIN ---------- */
  async login(email: string, password: string): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new Error("NOT_FOUND");

    const ok = await comparePassword(password, user.password);
    if (!ok) throw new Error("INVALID_PASSWORD");

    return this.issueTokens(user.id, user.username);
  }

  /* ---------- REFRESH ---------- */
  async refresh(oldToken: string) {
    if (!(await this.tokens.isValid(oldToken)))
      throw new Error("INVALID_REFRESH");

    const { id } = this.jwt.verifyRefresh(oldToken);

    const newRefresh = this.jwt.signRefresh(id);
    await this.tokens.save(newRefresh, id);
    await this.tokens.revoke(oldToken);

    const access = this.jwt.signAccess(id);
    return { access, newRefresh };
  }

  /* ---------- LOGOUT ---------- */
  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
  }

  /* ---------- helpers ---------- */
  private async issueTokens(id: string, username: string | null) {
    const access = this.jwt.signAccess(id);
    const refresh = this.jwt.signRefresh(id);
    await this.tokens.save(refresh, id);
    return { access, refresh, username };
  }
}
