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

stubModule("../../utils/log/audit-logger", {
  audit: (bindings?: Record<string, unknown>) =>
    (globalThis as any).__createTestLogger({ channel: "audit", ...(bindings || {}) }),
});

stubModule("../../models", {
  sequelize: {
    async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn({});
    },
  },
});

const okToken = "old-token";

const makeAuthService = () => {
  const { AuthService } = require("../auth.service");
  const service = new AuthService({
    jwtService: {
      verifyRefresh() {
        return { sub: "user-1" };
      },
      signRefresh() {
        return "new-refresh";
      },
      signAccess() {
        return "new-access";
      },
    } as any,
    tokenService: {
      async isValid(token: string) {
        return token === okToken;
      },
      async wasIssued() {
        return true;
      },
      async save() {},
      async revoke() {},
      async revokeAllForUser() {},
    } as any,
    sessionService: {
      async start() {
        return "sid-1";
      },
      async revokeByRefreshToken() {},
      async revokeAllForUser() {},
    } as any,
  });
  return service;
};

test("refresh registra sucesso em log e audit", async () => {
  (globalThis as any).__logRecords = [];
  const service = makeAuthService();
  const tokens = await service.refresh(okToken);
  assert.equal(tokens.refresh, "new-refresh");
  const records: any[] = (globalThis as any).__logRecords;
  const infoLog = records.find(
    (r) => r.level === "info" && r.payload?.evt === "auth.refresh.ok" && !r.bindings?.channel
  );
  assert.ok(infoLog, "log info deve ser emitido");
  const auditLog = records.find(
    (r) => r.bindings?.channel === "audit" && r.payload?.evt === "auth.refresh.ok"
  );
  assert.ok(auditLog, "audit deve registrar sucesso");
});

test("refresh detecta reuse e loga com severidade", async () => {
  (globalThis as any).__logRecords = [];
  const { AuthService } = require("../auth.service");
  const service = new AuthService({
    jwtService: {
      verifyRefresh() {
        return { sub: "user-2" };
      },
      signRefresh() {
        return "new-refresh";
      },
      signAccess() {
        return "new-access";
      },
    } as any,
    tokenService: {
      async isValid() {
        return false;
      },
      async wasIssued() {
        return true;
      },
      async save() {},
      async revoke() {},
      async revokeAllForUser() {},
    } as any,
    sessionService: {
      async start() {
        return "sid";
      },
      async revokeByRefreshToken() {},
      async revokeAllForUser() {},
    } as any,
  });
  await assert.rejects(() => service.refresh("compromised"), (err: any) => {
    return err?.code === "REFRESH_REUSE_DETECTED";
  });
  const records: any[] = (globalThis as any).__logRecords;
  const errorLog = records.find(
    (r) => r.level === "error" && r.payload?.evt === "auth.refresh.reuse_detected"
  );
  assert.ok(errorLog, "reutilização deve ser logada como erro");
  const auditLog = records.find(
    (r) => r.bindings?.channel === "audit" && r.payload?.evt === "auth.refresh.reuse_detected"
  );
  assert.ok(auditLog, "audit deve registrar reuse");
});
