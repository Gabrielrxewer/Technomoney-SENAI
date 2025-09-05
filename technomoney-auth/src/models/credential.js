"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Credential extends Model {
    static associate(models) {
      Credential.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  Credential.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      credential_id: { type: DataTypes.BLOB, allowNull: false, unique: true },
      public_key: { type: DataTypes.BLOB, allowNull: false },
      counter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      transports: { type: DataTypes.TEXT, allowNull: true },
      device_type: { type: DataTypes.STRING(32), allowNull: true },
      backed_up: { type: DataTypes.BOOLEAN, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      sequelize,
      modelName: "Credential",
      tableName: "credentials",
      timestamps: false,
    }
  );
  return Credential;
};
