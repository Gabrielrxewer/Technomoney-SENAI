import { Op } from "sequelize";
import { AssetRecord, Sequelize } from "../models";
import { logger } from "../utils/logger";
import { AppError } from "../utils/app-error";

export interface AssetRecordUpsert {
  assetId: number;
  price: number;
  variation: number;
  volume: number;
  date: Date;
}

export class AssetRecordRepository {
  async findToday(assetIds: number[], start: Date, end: Date) {
    try {
      return await AssetRecord.findAll({
        where: { asset_id: assetIds, date: { [Op.gte]: start, [Op.lt]: end } },
        attributes: ["asset_id", "price", "variation", "volume"],
      });
    } catch (err) {
      logger.error({ err }, "DB error on findToday");
      throw new AppError(500, "Database error");
    }
  }

  async bulkAdd(records: AssetRecordUpsert[]) {
    try {
      return await AssetRecord.bulkCreate(
        records.map((r) => ({
          asset_id: r.assetId,
          price: r.price,
          variation: r.variation,
          volume: r.volume,
          date: r.date,
        }))
      );
    } catch (err) {
      if (err instanceof Sequelize.ValidationError) {
        throw new AppError(400, "Invalid data for AssetRecord");
      }
      logger.error({ err }, "DB error on bulkAdd");
      throw new AppError(500, "Database error");
    }
  }

  async add(
    assetId: number,
    price: number,
    variation: number,
    volume: number,
    date: Date
  ) {
    try {
      return await AssetRecord.create({
        asset_id: assetId,
        price,
        variation,
        volume,
        date,
      });
    } catch (err) {
      logger.error({ err }, "DB error on add");
      throw new AppError(500, "Database error");
    }
  }

  async findLatest(assetId: number, start: Date, end: Date) {
    try {
      return await AssetRecord.findOne({
        where: { asset_id: assetId, date: { [Op.gte]: start, [Op.lt]: end } },
        order: [["date", "DESC"]],
      });
    } catch (err) {
      logger.error({ err }, "DB error on findLatest");
      throw new AppError(500, "Database error");
    }
  }
}
