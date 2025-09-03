import { Sequelize as SequelizeCtor } from "sequelize";
import * as SequelizeNS from "sequelize";
import { initAsset, Asset } from "./assets";
import { initAssetRecord, AssetRecord } from "./AssetRecord";

export const Sequelize = SequelizeNS;

const db = String(process.env.DB_DATABASE || "technomoney_stocks");
const user = String(process.env.DB_USERNAME || "postgres");
const pass = String(process.env.DB_PASSWORD || "");
const host = String(process.env.DB_HOST || "localhost");
const port = Number(process.env.DB_PORT || 5432);

export const sequelize = new SequelizeCtor(db, user, pass, {
  host,
  port,
  dialect: "postgres",
  logging: false,
});

initAsset(sequelize);
initAssetRecord(sequelize);

Asset.hasMany(AssetRecord, { foreignKey: "asset_id" });
AssetRecord.belongsTo(Asset, { foreignKey: "asset_id" });

export { Asset, AssetRecord };
