import "dotenv/config";
import { Options } from "sequelize";

type DbEnv = "production" | "development" | "test";
type DbOptions = Options & {
  use_env_variable?: string;
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
};

const base: DbOptions = {
  username: process.env.DB_USERNAME || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "",
  host: process.env.DB_HOST || "",
  port: Number(process.env.DB_PORT || 5432),
  dialect: (process.env.DB_DRIVER || "postgres") as any,
  logging: false,
};

const config: Record<DbEnv, DbOptions> = {
  production: { ...base },
  development: { ...base },
  test: { ...base },
};

export default config;
