import { UserRepository } from "../repositories/user.repository";

export class UserService {
  private repo = new UserRepository();
  findByEmail = this.repo.findByEmail;
  findByUsername = this.repo.findByUsername;
}
