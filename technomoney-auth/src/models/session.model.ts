import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface SessionAttributes {
  sid: string;
  user_id: string;
  refresh_token_hash: string;
  revoked: boolean;
  created_at: Date;
  revoked_at?: Date | null;
}

export type SessionCreationAttributes = Optional<
  SessionAttributes,
  "revoked" | "created_at" | "revoked_at"
>;

export class Session
  extends Model<SessionAttributes, SessionCreationAttributes>
  implements SessionAttributes
{
  public sid!: string;
  public user_id!: string;
  public refresh_token_hash!: string;
  public revoked!: boolean;
  public created_at!: Date;
  public revoked_at?: Date | null;

  static associate(_: any): void {}
}

export function initSessionModel(sequelize: Sequelize): typeof Session {
  Session.init(
    {
      sid: {
        type: DataTypes.STRING(128),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refresh_token_hash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      revoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Session",
      tableName: "sessions",
      timestamps: false,
    }
  );
  return Session;
}
