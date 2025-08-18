require("dotenv").config();

const base = {
  dialect: "mssql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  logging: false,
  dialectOptions: {
    options: {
      encrypt: String(process.env.DB_ENCRYPT || "true") === "true",
      trustServerCertificate:
        String(process.env.DB_TRUST_SERVER_CERT || "true") === "true",
    },
  },
};

module.exports = {
  development: {
    ...base,
  },
  production: {
    ...base,
  },
};
