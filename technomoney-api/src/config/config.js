require("dotenv").config();

const base = {
  dialect: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  logging: false,
};

module.exports = {
  development: {
    ...base,
  },
  production: {
    ...base,
  },
};
