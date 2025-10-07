import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

const Module = require("module");

const ensureStubPath = () => {
  const stubPath = path.resolve(__dirname, "../../../test-shims/node_modules");
  if (!Module.globalPaths.includes(stubPath)) {
    process.env.NODE_PATH = process.env.NODE_PATH
      ? `${stubPath}${path.delimiter}${process.env.NODE_PATH}`
      : stubPath;
    Module._initPaths();
  }
};

ensureStubPath();
import crypto from "crypto";

const stubModule = (specifier: string, exports: unknown) => {
  const resolved = require.resolve(specifier);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
};

const ensureLoggerStub = () => {
  const path = require.resolve("../../utils/log/logger");
  if (!require.cache[path]) {
    const createLogger = (bindings: Record<string, unknown>) => ({
      info(payload?: unknown, msg?: string) {
        (globalThis as any).__logRecords.push({
          level: "info",
          payload,
          msg,
          bindings,
        });
      },
      warn(payload?: unknown, msg?: string) {
        (globalThis as any).__logRecords.push({
          level: "warn",
          payload,
          msg,
          bindings,
        });
      },
      debug(payload?: unknown, msg?: string) {
        (globalThis as any).__logRecords.push({
          level: "debug",
          payload,
          msg,
          bindings,
        });
      },
      error(payload?: unknown, msg?: string) {
        (globalThis as any).__logRecords.push({
          level: "error",
          payload,
          msg,
          bindings,
        });
      },
    });
    (globalThis as any).__createTestLogger = createLogger;
    const root = createLogger({});
    (root as any).child = (bindings: Record<string, unknown>) =>
      createLogger({ ...(bindings || {}) });
    require.cache[path] = {
      id: path,
      filename: path,
      loaded: true,
      exports: {
        logger: root,
        getLogger(bindings: Record<string, unknown>) {
          return createLogger({ ...(bindings || {}) });
        },
      },
    } as any;
  }
};

(globalThis as any).__logRecords = [];
ensureLoggerStub();

stubModule("../../utils/log/logging-context", {
  getLogContext: () => (globalThis as any).__logContext || {},
});

stubModule("../../services/redis.service", {
  getRedis: async () => undefined,
});

const { TotpService } = require("../totp.service");

test.after(() => {
  delete require.cache[require.resolve("../../services/redis.service")];
  delete require.cache[require.resolve("../totp.service")];
});

const b32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32Map: Record<string, number> = Object.fromEntries(
  b32Alphabet.split("").map((c, i) => [c, i])
);

const base32Decode = (s: string) => {
  const normalized = s.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of normalized) {
    const v = b32Map[ch];
    if (v === undefined) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

const hotp = (secret: Buffer, counter: number) => {
  const buf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff;
    counter = counter >> 8;
  }
  const h = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);
  const mod = 10 ** 6;
  return String(code % mod).padStart(6, "0");
};

const generateTotp = (secretB32: string, tsMs: number) => {
  const counter = Math.floor(tsMs / 1000 / 30);
  return hotp(base32Decode(secretB32), counter);
};

test("challengeVerify registra sucesso e bloqueia replay", async () => {
  (globalThis as any).__logRecords = [];
  (globalThis as any).__logContext = { requestId: "req-test" };
  const service = new TotpService();
  const userId = "user-123";
  const enrollment = await service.setupStart(userId, "label");
  const fixedTs = 1710000000000;
  const originalNow = Date.now;
  Date.now = () => fixedTs;
  try {
    const code = generateTotp(enrollment.secret, fixedTs);
    const enrolled = await service.setupVerify(userId, code);
    assert.ok(enrolled.enrolled);
    const first = await service.challengeVerify(userId, code);
    assert.equal(first.verified, true);
    const second = await service.challengeVerify(userId, code);
    assert.equal(second.verified, false);
    assert.equal(second.reason, "replay");
  } finally {
    Date.now = originalNow;
  }
  const records: any[] = (globalThis as any).__logRecords;
  const success = records.find((r) => r.msg === "mfa.challenge.success");
  assert.ok(success, "sucesso deve ser logado");
  assert.equal(success.bindings.svc, "TotpService");
  const replay = records.find(
    (r) => r.msg === "mfa.challenge.fail" && r.payload?.evt === "mfa.challenge.replay"
  );
  assert.ok(replay, "replay deve ser logado");
});

test("challengeVerify rejeita códigos inválidos e loga falha", async () => {
  (globalThis as any).__logRecords = [];
  (globalThis as any).__logContext = { requestId: "req-invalid" };
  const service = new TotpService();
  const userId = "user-456";
  const enrollment = await service.setupStart(userId, "label");
  const fixedTs = 1710003600000;
  const originalNow = Date.now;
  Date.now = () => fixedTs;
  let result: any;
  try {
    const code = generateTotp(enrollment.secret, fixedTs);
    const enrolled = await service.setupVerify(userId, code);
    assert.ok(enrolled.enrolled);
    result = await service.challengeVerify(userId, "111111");
  } finally {
    Date.now = originalNow;
  }
  assert.equal(result.verified, false);
  const records: any[] = (globalThis as any).__logRecords;
  const invalid = records.find(
    (r) => r.msg === "mfa.challenge.fail" && r.payload?.evt === "mfa.challenge.invalid_code"
  );
  assert.ok(invalid, "falha deve ser registrada");
});
