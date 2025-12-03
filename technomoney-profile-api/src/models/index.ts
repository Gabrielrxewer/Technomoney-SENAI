import { Sequelize as SequelizeCtor } from "sequelize";
import { env } from "../config/env";
import { initProfileModel, Profile } from "./profile.model";

const port = env.DB_PORT ? Number(env.DB_PORT) : 5432;

export const sequelize = new SequelizeCtor(
  env.DB_DATABASE,
  env.DB_USERNAME,
  env.DB_PASSWORD || "",
  {
    host: env.DB_HOST,
    port,
    dialect: env.DB_DRIVER as any,
    logging: false,
  }
);

initProfileModel(sequelize);

export { Profile };
