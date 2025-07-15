import { Op } from "sequelize";
import { AssetRecord } from "../models";

export class AssetRecordRepository {
  findToday(assetIds: number[], start: Date, end: Date) {
    return AssetRecord.findAll({
      where: { asset_id: assetIds, date: { [Op.gte]: start, [Op.lt]: end } },
      attributes: ["asset_id", "price", "variation", "volume"],
    });
  }

  async add(
    asset_id: number,
    price: number,
    variation: number,
    volume: number,
    date: Date
  ) {
    return AssetRecord.create({ asset_id, price, variation, volume, date });
  }

  findLatest(asset_id: number, start: Date, end: Date) {
    return AssetRecord.findOne({
      where: { asset_id, date: { [Op.gte]: start, [Op.lt]: end } },
      order: [["date", "DESC"]],
    });
  }
}