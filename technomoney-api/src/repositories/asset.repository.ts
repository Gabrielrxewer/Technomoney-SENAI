import { Asset } from "../models";

export class AssetRepository {
  findOrCreate(tag: string, name: string) {
    return Asset.findOrCreate({ where: { tag }, defaults: { name } });
  }

  findByTag(tag: string) {
    return Asset.findOne({ where: { tag }, attributes: ["id", "tag", "name"] });
  }

  findAll() {
    return Asset.findAll({ attributes: ["id", "tag", "name"] });
  }
}
