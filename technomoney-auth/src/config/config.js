const fs = require("fs");
const path = require("path");
require("dotenv").config();

try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "CommonJS" },
    project: path.resolve(__dirname, "..", "..", "tsconfig.json"),
  });
} catch (e) {}

const cfg = require("./config.ts");
const exported = cfg.default || cfg;

console.log(
  "[db config] env=%s host=%s user=%s pwdType=%s pwdLen=%d",
  process.env.NODE_ENV || "development",
  process.env.DB_HOST,
  process.env.DB_USERNAME,
  typeof process.env.DB_PASSWORD,
  (process.env.DB_PASSWORD || "").length
);

module.exports = exported;
