const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const tsConfigPath = path.resolve(__dirname, "config.ts");

let tsNodeAvailable = false;
try {
  require.resolve("ts-node/register");
  tsNodeAvailable = true;
} catch (error) {
  if (error && error.code && error.code !== "MODULE_NOT_FOUND") {
    throw error;
  }
}

if (tsNodeAvailable) {
  try {
    require("ts-node").register({
      transpileOnly: true,
      compilerOptions: {
        module: "CommonJS",
      },
      project: path.resolve(projectRoot, "tsconfig.json"),
    });
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      tsNodeAvailable = false;
    } else {
      throw error;
    }
  }
}

let configModule;
if (tsNodeAvailable && fs.existsSync(tsConfigPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  configModule = require(tsConfigPath);
}

if (!configModule) {
  const fallbackCandidates = [
    path.resolve(projectRoot, "dist", "config", "config.js"),
  ];

  for (const candidate of fallbackCandidates) {
    const normalizedCandidate = path.resolve(candidate);
    if (normalizedCandidate === path.resolve(__filename)) {
      continue;
    }
    if (fs.existsSync(normalizedCandidate)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      configModule = require(normalizedCandidate);
      break;
    }
  }
}

if (!configModule) {
  const error = new Error(
    "Unable to locate a compiled Sequelize configuration. Run `npm run build` before executing migrations.",
  );
  error.code = "ENOENT";
  throw error;
}

module.exports = configModule.default || configModule;
