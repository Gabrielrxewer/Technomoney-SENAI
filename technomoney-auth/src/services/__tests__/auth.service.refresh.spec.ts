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

const makeAuthService = (options: { sessionAal?: string } = {}) => {
  const { AuthService } = require("../auth.service");
  const state: any = { signAccessPayloads: [], startCalls: [] };
  const service = new AuthService({
    jwtService: {
      verifyRefresh() {
        return { sub: "user-1" };
      },
      signRefresh() {
        return "new-refresh";
      },
      signAccess(_: string, payload: any) {
        state.signAccessPayloads.push(payload);
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
      async start(_: string, __: string, ___: unknown, aal?: string) {
        state.startCalls.push(aal);
        return "sid-1";
      },
      async revokeByRefreshToken() {},
      async revokeAllForUser() {},
      async getAalByRefreshToken() {
        return options.sessionAal ?? "aal1";
      },
    } as any,
  });
  return { service, state };
};

test("refresh registra sucesso em log e audit", async () => {
  (globalThis as any).__logRecords = [];
  const { service, state } = makeAuthService();
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
  assert.deepEqual(state.startCalls, ["aal1"], "refresh padrão deve manter AAL1");
  assert.equal(state.signAccessPayloads.length, 1);
  assert.equal(state.signAccessPayloads[0].acr, "aal1");
  assert.deepEqual(state.signAccessPayloads[0].amr, ["pwd"]);
  assert.ok(state.signAccessPayloads[0].sid, "payload deve carregar sid");
});

test("refresh mantém acr=aal2 após step-up", async () => {
  (globalThis as any).__logRecords = [];
  const { service, state } = makeAuthService({ sessionAal: "aal2" });
  const tokens = await service.refresh(okToken);
  assert.equal(tokens.refresh, "new-refresh");
  assert.deepEqual(state.startCalls, ["aal2"], "sessão deve continuar marcada como AAL2");
  assert.equal(state.signAccessPayloads.length, 1);
  assert.equal(state.signAccessPayloads[0].acr, "aal2");
  assert.deepEqual(state.signAccessPayloads[0].amr, ["pwd", "otp"]);
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
      async getAalByRefreshToken() {
        return "aal1";
      },
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
