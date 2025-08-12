import { Sequelize } from "sequelize";
require("dotenv/config");

export default new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 1433,
    dialect: "mssql",
    logging: false,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    },
  }
);
