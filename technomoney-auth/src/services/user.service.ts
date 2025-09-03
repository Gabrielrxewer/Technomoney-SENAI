import { UserRepository } from "../repositories/user.repository";
import { logger } from "../utils/logger";

const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
const maskEmail = (e?: string) => {
  if (!e) return "";
  const [user, domain] = e.split("@");
  if (!domain) return mask(e);
  const u = user.length <= 2 ? "*" : `${user.slice(0, 2)}***`;
  return `${u}@${domain}`;
};

export class UserService {
  private repo = new UserRepository();

  async findByEmail(email: string) {
    logger.debug({ email: maskEmail(email) }, "user.find_by_email.start");
    const u = await this.repo.findByEmail(email);
    logger.debug({ found: !!u }, "user.find_by_email.result");
    return u;
  }

  async findByUsername(username: string) {
    logger.debug({ username }, "user.find_by_username.start");
    const u = await this.repo.findByUsername(username);
    logger.debug({ found: !!u }, "user.find_by_username.result");
    return u;
  }
}
