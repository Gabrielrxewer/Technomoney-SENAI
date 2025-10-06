require("dotenv/config");

module.exports = {
  development: {
    dialect: "mssql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    logging: false,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    },
  },
};
