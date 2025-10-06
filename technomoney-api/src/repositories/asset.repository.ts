import { Asset, Sequelize } from "../models";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export class AssetRepository {
  async findOrCreate(tag: string, name: string) {
    try {
      return await Asset.findOrCreate({ where: { tag }, defaults: { name } });
    } catch (err) {
      logger.error({ err }, "DB error on findOrCreate");
      if (err instanceof Sequelize.UniqueConstraintError) {
        throw new AppError(409, `Asset com tag '${tag}' já existe`);
      }
      throw new AppError(500, "Database error");
    }
  }

  async findByTag(tag: string) {
    try {
      return await Asset.findOne({
        where: { tag },
        attributes: ["id", "tag", "name"],
      });
    } catch (err) {
      logger.error({ err }, "DB error on findByTag");
      throw new AppError(500, "Database error");
    }
  }

  async findAll() {
    try {
      return await Asset.findAll({ attributes: ["id", "tag", "name"] });
    } catch (err) {
      logger.error({ err }, "DB error on findAll");
      throw new AppError(500, "Database error");
    }
  }
}
