"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    static associate(models) {
      Asset.hasMany(models.AssetRecord, { foreignKey: "asset_id" });
    }
  }

  Asset.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      tag: {
        type: DataTypes.STRING(4),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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
      modelName: "Asset",
      tableName: "assets",
      timestamps: false,
    }
  );

  return Asset;
};
