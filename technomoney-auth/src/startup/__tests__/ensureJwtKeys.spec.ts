import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ensureJwtKeys } from "../ensureJwtKeys";

const withTempDir = async (
  fn: (dir: string) => Promise<void> | void,
  prefix = "jwt-keys-test-"
) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const setEnv = (values: Record<string, string | undefined>) => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return previous;
};

const restoreEnv = (snapshot: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const listKeyFiles = (dir: string) =>
  (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    .filter((file) =>
      /^jwt-(ES256|RS256|PS256|EdDSA)-\d{4}-\d{2}_(private|public)\.pem$/.test(file)
    )
    .sort();

test("ensureJwtKeys generates ephemeral keys when allowed", async () => {
  await withTempDir(async (dir) => {
    const snapshot = setEnv({
      NODE_ENV: "development",
      JWT_KEYS_DIR: dir,
      JWT_AUTO_GENERATE_KEYS: "1",
      JWT_KEYS_ROTATION_TAGS: "2025-09,2026-03",
      JWT_ALG: "ES256",
      JWT_KID: undefined,
      JOSE_STUB: "0",
    });
    try {
      await ensureJwtKeys();
      const files = listKeyFiles(dir);
      assert.ok(files.length >= 4, "expected at least two key pairs");
      const kids = new Set(files.map((file) => file.replace(/_(private|public)\.pem$/, "")));
      assert.ok(kids.size >= 2, "should generate rotation-ready kids");
      assert.ok(process.env.JWT_KID && kids.has(process.env.JWT_KID));
    } finally {
      restoreEnv(snapshot);
    }
  });
});

test("ensureJwtKeys fails in production without auto generation", async () => {
  await withTempDir(async (dir) => {
    const snapshot = setEnv({
      NODE_ENV: "production",
      JWT_KEYS_DIR: dir,
      JWT_AUTO_GENERATE_KEYS: undefined,
      JWT_ALG: "ES256",
      JWT_KID: undefined,
      JOSE_STUB: "0",
    });
    try {
      await assert.rejects(() => ensureJwtKeys(), /no_keys_found/);
      const files = listKeyFiles(dir);
      assert.equal(files.length, 0);
    } finally {
      restoreEnv(snapshot);
    }
  });
});

test("ensureJwtKeys can generate development keys even when NODE_ENV=production", async () => {
  await withTempDir(async (dir) => {
    const snapshot = setEnv({
      NODE_ENV: "production",
      JWT_KEYS_DIR: dir,
      JWT_AUTO_GENERATE_KEYS: "1",
      JWT_KEYS_ROTATION_TAGS: "2025-09",
      JWT_ALG: "ES256",
      JWT_KID: undefined,
      JOSE_STUB: "0",
    });
    try {
      await ensureJwtKeys();
      const files = listKeyFiles(dir);
      assert.ok(files.length >= 2, "should have generated a key pair");
      const kids = new Set(files.map((file) => file.replace(/_(private|public)\.pem$/, "")));
      assert.ok(kids.size >= 1);
      assert.ok(process.env.JWT_KID && kids.has(process.env.JWT_KID));
    } finally {
      restoreEnv(snapshot);
    }
  }, "jwt-keys-prod-autogen-");
});

test("ensureJwtKeys uses existing key pairs without regeneration", async () => {
  await withTempDir(async (dir) => {
    const priv = path.join(dir, "jwt-ES256-2025-09_private.pem");
    const pub = path.join(dir, "jwt-ES256-2025-09_public.pem");
    fs.writeFileSync(priv, "PRIVATE", { mode: 0o600 });
    fs.writeFileSync(pub, "PUBLIC", { mode: 0o644 });
    const snapshot = setEnv({
      NODE_ENV: "production",
      JWT_KEYS_DIR: dir,
      JWT_AUTO_GENERATE_KEYS: "0",
      JWT_KID: "jwt-ES256-2025-09",
      JOSE_STUB: "0",
    });
    try {
      await ensureJwtKeys();
      assert.equal(process.env.JWT_KID, "jwt-ES256-2025-09");
    } finally {
      restoreEnv(snapshot);
    }
  }, "jwt-keys-existing-");
});

test("ensureJwtKeys normalizes Windows paths inside Linux containers", async () => {
  await withTempDir(async (baseDir) => {
    const fallback = path.join(baseDir, "keys");
    const snapshot = setEnv({
      NODE_ENV: "development",
      JWT_KEYS_DIR: "C:\\Technomoney-SENAI\\technomoney-auth",
      JWT_AUTO_GENERATE_KEYS: "true",
      JWT_KEYS_ROTATION_TAGS: "2025-09",
      JWT_ALG: "ES256",
      JWT_KID: undefined,
      JOSE_STUB: "0",
    });
    const prevCwd = process.cwd();
    process.chdir(baseDir);
    try {
      await ensureJwtKeys();
      assert.equal(process.env.JWT_KEYS_DIR, fallback);
      const files = listKeyFiles(fallback);
      assert.ok(files.length >= 2);
    } finally {
      process.chdir(prevCwd);
      restoreEnv(snapshot);
    }
  }, "jwt-keys-win-path-");
});
