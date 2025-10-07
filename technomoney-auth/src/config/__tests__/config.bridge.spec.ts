import assert from "node:assert/strict";
import test from "node:test";

import configTs from "../config";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configJs = require("../config.js");

test("config.js reexports the TypeScript database configuration", () => {
  assert.deepEqual(
    configJs,
    configTs,
    "config.js should expose the same configuration exported by config.ts",
  );
});
