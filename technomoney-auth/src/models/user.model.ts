import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface UserAttributes {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "username" | "email_verified" | "created_at" | "updated_at"
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public email!: string;
  public username!: string | null;
  public password_hash!: string;
  public email_verified!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
  static associate(_: any): void {}
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      username: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      modelName: "User",
      tableName: "users",
      timestamps: false,
    }
  );
  return User;
}
