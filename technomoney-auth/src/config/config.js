const fs = require("fs");
const path = require("path");
require("dotenv").config();

let exported;

try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "CommonJS" },
    project: path.resolve(__dirname, "..", "..", "tsconfig.json"),
  });
  const cfg = require("./config.ts");
  exported = cfg.default || cfg;
} catch (err) {
  const distPath = path.resolve(__dirname, "..", "..", "dist", "config", "config.js");
  if (!fs.existsSync(distPath)) {
    throw err;
  }
  const compiled = require(distPath);
  exported = compiled.default || compiled;
}

console.log(
  "[db config] env=%s host=%s user=%s pwdType=%s pwdLen=%d",
  process.env.NODE_ENV || "development",
  process.env.DB_HOST,
  process.env.DB_USERNAME,
  typeof process.env.DB_PASSWORD,
  (process.env.DB_PASSWORD || "").length
);

module.exports = exported;
