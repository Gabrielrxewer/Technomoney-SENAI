import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const sequelizercPath = path.join(projectRoot, ".sequelizerc");

function loadSequelizerc() {
  delete require.cache[sequelizercPath];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(sequelizercPath);
}

test(".sequelizerc defaults to source tree when build artifacts are absent", () => {
  const previousHint = process.env.SEQUELIZE_DIR_HINT;
  delete process.env.SEQUELIZE_DIR_HINT;

  try {
    const config = loadSequelizerc();
    assert.equal(
      config.config,
      path.join(projectRoot, "src", "config", "config.js"),
      "config path should fall back to the TypeScript source tree",
    );
    assert.equal(
      config["models-path"],
      path.join(projectRoot, "src", "models"),
      "models path should point to the TypeScript sources by default",
    );
    assert.equal(
      config["migrations-path"],
      path.join(projectRoot, "src", "migrations"),
      "migrations path should default to the TypeScript sources",
    );
    assert.equal(
      config["seeders-path"],
      path.join(projectRoot, "src", "seeders"),
      "seeders path should default to the TypeScript sources",
    );
  } finally {
    if (previousHint) {
      process.env.SEQUELIZE_DIR_HINT = previousHint;
    } else {
      delete process.env.SEQUELIZE_DIR_HINT;
    }
  }
});

test(".sequelizerc honors SEQUELIZE_DIR_HINT and prefers existing build folders across cwd changes", () => {
  const previousHint = process.env.SEQUELIZE_DIR_HINT;
  const previousCwd = process.cwd();

  const artifactRoot = path.join(projectRoot, "__tmp_dist__");
  const configDir = path.join(artifactRoot, "config");
  const modelsDir = path.join(artifactRoot, "models");
  const migrationsDir = path.join(artifactRoot, "migrations");
  const seedersDir = path.join(artifactRoot, "seeders");

  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(migrationsDir, { recursive: true });
  fs.mkdirSync(seedersDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "config.js"), "module.exports = {};");

  process.env.SEQUELIZE_DIR_HINT = path.relative(projectRoot, artifactRoot);
  process.chdir(path.parse(projectRoot).root);


  try {
    const config = loadSequelizerc();
    assert.equal(
      config.config,
      path.join(configDir, "config.js"),
      "config path should use the hinted build directory even when cwd differs",

    );
    assert.equal(
      config["models-path"],
      modelsDir,
      "models path should use the hinted build directory",
    );
    assert.equal(
      config["migrations-path"],
      migrationsDir,
      "migrations path should use the hinted build directory",
    );
    assert.equal(
      config["seeders-path"],
      seedersDir,
      "seeders path should use the hinted build directory",
    );
  } finally {
    process.chdir(previousCwd);
    if (previousHint) {
      process.env.SEQUELIZE_DIR_HINT = previousHint;
    } else {
      delete process.env.SEQUELIZE_DIR_HINT;
    }
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

test(".sequelizerc defaults still locate dist artefacts when run from outside the project root", () => {
  const previousHint = process.env.SEQUELIZE_DIR_HINT;
  const previousCwd = process.cwd();
  const distRoot = path.join(projectRoot, "dist");
  const configDir = path.join(distRoot, "config");

  fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "config.js"), "module.exports = {};");

  delete process.env.SEQUELIZE_DIR_HINT;
  process.chdir(path.parse(projectRoot).root);

  try {
    const config = loadSequelizerc();
    assert.equal(
      config.config,
      path.join(configDir, "config.js"),
      "config path should rely on the dist copy even without explicit hints",
    );
  } finally {
    process.chdir(previousCwd);
    if (previousHint) {
      process.env.SEQUELIZE_DIR_HINT = previousHint;
    } else {
      delete process.env.SEQUELIZE_DIR_HINT;
    }
    fs.rmSync(distRoot, { recursive: true, force: true });
  }
});
