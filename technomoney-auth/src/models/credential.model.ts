import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface CredentialAttributes {
  id: string;
  user_id: string;
  credential_id: Buffer;
  public_key: Buffer;
  counter: number;
  transports: string | null;
  device_type: string | null;
  backed_up: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export type CredentialCreationAttributes = Optional<
  CredentialAttributes,
  | "id"
  | "transports"
  | "device_type"
  | "backed_up"
  | "created_at"
  | "updated_at"
>;

export class Credential
  extends Model<CredentialAttributes, CredentialCreationAttributes>
  implements CredentialAttributes
{
  public id!: string;
  public user_id!: string;
  public credential_id!: Buffer;
  public public_key!: Buffer;
  public counter!: number;
  public transports!: string | null;
  public device_type!: string | null;
  public backed_up!: boolean | null;
  public created_at!: Date;
  public updated_at!: Date;
  static associate(_: any): void {}
}

export function initCredentialModel(sequelize: Sequelize): typeof Credential {
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
}
