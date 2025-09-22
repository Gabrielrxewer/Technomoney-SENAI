const path = require("path");

try {
  require.resolve("ts-node/register");
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: {
      module: "CommonJS",
    },
    project: path.resolve(__dirname, "..", "..", "tsconfig.json"),
  });
} catch (error) {
  // Ignore if ts-node is not installed; assume a compiled version is available.
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require("./config.ts");
module.exports = config.default || config;
