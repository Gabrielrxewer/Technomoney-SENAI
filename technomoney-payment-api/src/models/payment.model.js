module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      fullName: { type: DataTypes.STRING, allowNull: false },
      cpf: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      method: { type: DataTypes.STRING, allowNull: false },
      preferenceId: { type: DataTypes.STRING, allowNull: false, unique: true },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "Payments",
      timestamps: true,
      underscored: false,
    }
  );
