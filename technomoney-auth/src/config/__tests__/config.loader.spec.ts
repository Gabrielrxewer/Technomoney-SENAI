import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const loaderPath = path.join(projectRoot, "src", "config", "config.js");
const compiledConfigPath = path.join(projectRoot, "dist", "config", "config.js");

function withPatchedResolve(fn: () => void) {
  const originalResolveFilename = (Module as unknown as { _resolveFilename: typeof Module._resolveFilename })._resolveFilename;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Module as unknown as { _resolveFilename: typeof Module._resolveFilename })._resolveFilename = function patched(request: string, parent: any, isMain: boolean, options: any) {
    if (request === "ts-node/register" || request === "ts-node") {
      const error = new Error(`Cannot find module '${request}'`);
      // @ts-expect-error - custom property used for compatibility with Node's module resolution.
      error.code = "MODULE_NOT_FOUND";
      throw error;
    }

    return originalResolveFilename.call(Module, request, parent, isMain, options);
  };

  try {
    fn();
  } finally {
    (Module as unknown as { _resolveFilename: typeof Module._resolveFilename })._resolveFilename = originalResolveFilename;
  }
}

test("config.js falls back to compiled artefact when ts-node is unavailable", () => {
  const hadPrevious = fs.existsSync(compiledConfigPath);
  const previousContent = hadPrevious ? fs.readFileSync(compiledConfigPath, "utf8") : undefined;

  fs.mkdirSync(path.dirname(compiledConfigPath), { recursive: true });
  fs.writeFileSync(
    compiledConfigPath,
    "module.exports = { development: { url: 'postgres://fallback-url' } };",
  );

  delete require.cache[loaderPath];
  delete require.cache[compiledConfigPath];

  try {
    withPatchedResolve(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loadedConfig = require(loaderPath);
      assert.equal(
        loadedConfig.development.url,
        "postgres://fallback-url",
        "should expose the compiled configuration when ts-node cannot be used",
      );
    });
  } finally {
    if (hadPrevious && previousContent !== undefined) {
      fs.writeFileSync(compiledConfigPath, previousContent);
    } else {
      fs.rmSync(compiledConfigPath, { force: true });
    }
    delete require.cache[loaderPath];
    delete require.cache[compiledConfigPath];
  }
});
