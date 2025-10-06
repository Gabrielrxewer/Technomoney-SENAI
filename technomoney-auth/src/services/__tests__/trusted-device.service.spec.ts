import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import Module from "module";

const ensureStubPath = () => {
  const stubPath = path.resolve(__dirname, "../../../test-shims/node_modules");
  if (!Module.globalPaths.includes(stubPath)) {
    process.env.NODE_PATH = process.env.NODE_PATH
      ? `${stubPath}${path.delimiter}${process.env.NODE_PATH}`
      : stubPath;
    Module._initPaths();
  }
};

const ensureLoggerStub = () => {
  const loggerPath = require.resolve("../../utils/log/logger");
  if (!require.cache[loggerPath]) {
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
    (globalThis as any).__logRecords = [];
    const root = createLogger({});
    (root as any).child = (bindings: Record<string, unknown>) =>
      createLogger({ ...(bindings || {}) });
    require.cache[loggerPath] = {
      id: loggerPath,
      filename: loggerPath,
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

ensureStubPath();
ensureLoggerStub();

const svc = require("../trusted-device.service");
const {
  setTrustedDevice,
  getTrustedDevice,
  revokeTrustedDevice,
  __setTrustedDeviceDeps,
  __resetTrustedDeviceDeps,
} = svc;

const SECRET = "trusted-device-secret-for-tests-1234567890";

process.env.TRUSTED_DEVICE_SECRET = SECRET;

test.after(() => {
  __resetTrustedDeviceDeps();
});

test("getTrustedDevice usa cookie assinado quando redis indisponível", async () => {
  __setTrustedDeviceDeps({ getRedis: async () => undefined });
  const cookies: Record<string, { value: string }> = {};
  const res: any = {
    cookie(name: string, value: string) {
      cookies[name] = { value };
      return this;
    },
    clearCookie() {
      return this;
    },
  };
  await setTrustedDevice(res, "user-xyz", { acr: "aal2", amr: ["pwd", "otp"] });
  const req: any = {
    cookies: Object.fromEntries(
      Object.entries(cookies).map(([k, v]) => [k, v.value])
    ),
  };

  const metadata = await getTrustedDevice(req);
  assert.ok(metadata, "metadata deve ser recuperada");
  assert.equal(metadata!.userId, "user-xyz");
  assert.equal(metadata!.acr, "aal2");
  assert.deepEqual(metadata!.amr, ["pwd", "otp"]);
  assert.ok(typeof metadata!.issuedAt === "number");
});

test("revokeTrustedDevice remove cookies assinados", async () => {
  const redisCalls: any[] = [];
  __setTrustedDeviceDeps({
    getRedis: async () => ({
      async setEx(...args: unknown[]) {
        redisCalls.push(["setEx", ...args]);
      },
      async del(...args: unknown[]) {
        redisCalls.push(["del", ...args]);
      },
      async get() {
        return null;
      },
    }),
  });

  const cookies: Record<string, { value: string }> = {};
  const res: any = {
    cookie(name: string, value: string) {
      cookies[name] = { value };
      return this;
    },
    clearCookie(name: string) {
      delete cookies[name];
      return this;
    },
  };
  await setTrustedDevice(res, "user-abc");
  const req: any = { cookies: Object.fromEntries(Object.entries(cookies).map(([k, v]) => [k, v.value])) };

  await revokeTrustedDevice(req, res);
  assert.equal(cookies.tdid, undefined);
  assert.equal(cookies.tdmeta, undefined);
  const delCall = redisCalls.find((entry) => entry[0] === "del");
  assert.ok(delCall, "redis.del deve ser chamado");
});
