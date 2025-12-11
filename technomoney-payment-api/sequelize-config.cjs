require("dotenv/config");

const dialect = process.env.DB_DRIVER || "postgres";

const baseConfig = {
  dialect,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || (dialect === "mssql" ? 1433 : 5432),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  logging: false,
};

if (dialect === "mssql") {
  baseConfig.dialectOptions = {
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

module.exports = {
  development: baseConfig,
  production: baseConfig,
};
