import { Transaction } from "sequelize";
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
    return User.create({
      email: data.email,
      username: data.username ?? null,
      password_hash: data.password,
    });
  }

  updatePassword(
    id: string,
    passwordHash: string,
    tx?: Transaction
  ): Promise<[number]> {
    return User.update(
      { password_hash: passwordHash },
      { where: { id }, transaction: tx }
    );
  }

  markEmailVerified(id: string, tx?: Transaction): Promise<[number]> {
    return User.update(
      { email_verified: true },
      { where: { id }, transaction: tx }
    );
  }
}
