"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AssetRecord extends Model {
    static associate(models) {
      AssetRecord.belongsTo(models.Asset, { foreignKey: "asset_id" });
    }
  }

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
        defaultValue: sequelize.literal("SYSDATETIME()"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("SYSDATETIME()"),
      },
    },
    {
      sequelize,
      modelName: "AssetRecord",
      tableName: "asset_records",
      timestamps: false,
    }
  );

  return AssetRecord;
};
