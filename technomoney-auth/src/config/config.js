require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || '',
    server: process.env.DB_HOST || '',
    dialect: process.env.DB_DRIVER || '',
    dialectOptions: {
      options: {
        encrypt: false,
      },
    },
  },
};
