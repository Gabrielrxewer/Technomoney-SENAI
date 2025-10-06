import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface PasswordResetAttributes {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type PasswordResetCreationAttributes = Optional<
  PasswordResetAttributes,
  "id" | "used_at" | "created_at" | "updated_at"
>;

export class PasswordReset
  extends Model<PasswordResetAttributes, PasswordResetCreationAttributes>
  implements PasswordResetAttributes
{
  declare id: string;
  declare user_id: string;
  declare token_hash: string;
  declare expires_at: Date;
  declare used_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;

  static associate(): void {}
}

export function initPasswordResetModel(
  sequelize: Sequelize
): typeof PasswordReset {
  PasswordReset.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
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
      modelName: "PasswordReset",
      tableName: "password_resets",
      timestamps: false,
    }
  );

  return PasswordReset;
}
