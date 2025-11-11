import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";

export interface ProfileAttributes {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: Date | null;
  phone_number: string | null;
  profession: string | null;
  biography: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: Date;
  updated_at: Date;
}

export type ProfileCreationAttributes = Optional<
  ProfileAttributes,
  | "id"
  | "first_name"
  | "last_name"
  | "birth_date"
  | "phone_number"
  | "profession"
  | "biography"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "postal_code"
  | "country"
  | "created_at"
  | "updated_at"
>;

export class Profile
  extends Model<ProfileAttributes, ProfileCreationAttributes>
  implements ProfileAttributes
{
  declare id: string;
  declare user_id: string;
  declare first_name: string | null;
  declare last_name: string | null;
  declare birth_date: Date | null;
  declare phone_number: string | null;
  declare profession: string | null;
  declare biography: string | null;
  declare address_line1: string | null;
  declare address_line2: string | null;
  declare city: string | null;
  declare state: string | null;
  declare postal_code: string | null;
  declare country: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initProfileModel(sequelize: Sequelize): typeof Profile {
  Profile.init(
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
        unique: true,
      },
      first_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      profession: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      biography: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address_line1: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      address_line2: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      postal_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      sequelize,
      tableName: "profiles",
      modelName: "Profile",
      timestamps: false,
    }
  );

  return Profile;
}
