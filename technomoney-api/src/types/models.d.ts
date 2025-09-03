declare module "../models" {
  import type { Model, ModelStatic } from "sequelize";

  export const sequelize: any;
  export const Sequelize: any;

  export interface AssetInstance extends Model<any, any> {}
  export const Asset: ModelStatic<AssetInstance>;

  export interface AssetRecordInstance extends Model<any, any> {}
  export const AssetRecord: ModelStatic<AssetRecordInstance>;
}
