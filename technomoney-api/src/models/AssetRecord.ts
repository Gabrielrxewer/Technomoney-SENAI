import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize,
} from "sequelize";

export class AssetRecord extends Model<
  InferAttributes<AssetRecord>,
  InferCreationAttributes<AssetRecord>
> {
  declare id: CreationOptional<number>;
  declare asset_id: number;
  declare price: number;
  declare variation: number;
  declare volume: number;
  declare date: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

export function initAssetRecord(sequelize: Sequelize) {
  AssetRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      variation: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      volume: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "AssetRecord",
      tableName: "asset_records",
      timestamps: false,
    }
  );
}
