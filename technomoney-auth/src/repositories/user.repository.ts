import { User } from "../models";

export class UserRepository {
  findByEmail(email: string) {
    return User.findOne({ where: { email } });
  }

  findByUsername(username: string) {
    return User.findOne({ where: { username } });
  }

  findById(id: string) {
    return User.findByPk(id);
  }

  create(data: { email: string; password: string; username?: string | null }) {
    return User.create(data);
  }
}
