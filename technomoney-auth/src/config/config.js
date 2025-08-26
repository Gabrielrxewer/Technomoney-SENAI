require("dotenv").config();

const base = {
  username: process.env.DB_USERNAME || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "",
  host: process.env.DB_HOST || "",
  port: Number(process.env.DB_PORT || 1433),
  dialect: process.env.DB_DRIVER || "mssql",
  logging: false,
  dialectOptions: {
    options: {
      encrypt: false
    }
  }
};

module.exports = {
  production: { ...base },
  development: { ...base },
  test: { ...base }
};
