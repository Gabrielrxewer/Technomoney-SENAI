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

ensureStubPath();

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

class TotpServiceStub {
  static nextChallenge = { verified: true } as any;
  async status() {
    return false;
  }
  async setupStart() {
    return { secret: "" };
  }
  async setupVerify() {
    return { enrolled: false };
  }
  async challengeVerify() {
    return TotpServiceStub.nextChallenge;
  }
}

class AuthServiceStub {
  async createSession() {
    return { access: "access-token", refresh: "refresh-token" };
  }
}

const totpController = require("../totp.controller");
const {
  challengeVerify,
  __setTotpControllerDeps,
  __resetTotpControllerDeps,
} = totpController;

test.after(() => {
  __resetTotpControllerDeps();
});

test("challengeVerify loga sucesso com requestId", async () => {
  (globalThis as any).__logRecords = [];
  TotpServiceStub.nextChallenge = { verified: true };
  __setTotpControllerDeps({
    totpService: new TotpServiceStub() as any,
    authService: new AuthServiceStub() as any,
    cookieOptions: {},
    setTrustedDevice: async () => {},
    resetTotpLimiter: async () => {},
    deriveSid: () => "sid-123",
    scheduleTokenExpiringSoon: () => {},
  });
  const req: any = {
    user: { id: "user-1", acr: "step-up" },
    body: { code: "123456" },
    requestId: "req-1",
  };
  const jsonPayload: any[] = [];
  const res: any = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonPayload.push(data);
      return this;
    },
    cookie() {
      return this;
    },
  };

  await challengeVerify(req, res);

  assert.deepEqual(jsonPayload[0], {
    token: "access-token",
    acr: "aal2",
    username: null,
  });
  const records: any[] = (globalThis as any).__logRecords;
  const success = records.find((r) => r.msg === "mfa.challenge.success");
  assert.ok(success, "sucesso deve ser logado");
  assert.equal(success.bindings?.requestId, undefined);
  assert.equal(success.payload.requestId, "req-1");
});

test("challengeVerify loga falha com motivo", async () => {
  (globalThis as any).__logRecords = [];
  TotpServiceStub.nextChallenge = { verified: false, reason: "replay" };
  __setTotpControllerDeps({
    totpService: new TotpServiceStub() as any,
    authService: new AuthServiceStub() as any,
    cookieOptions: {},
    setTrustedDevice: async () => {},
    resetTotpLimiter: async () => {},
    deriveSid: () => "sid-123",
    scheduleTokenExpiringSoon: () => {},
  });
  const req: any = {
    user: { id: "user-2", acr: "step-up" },
    body: { code: "123456" },
    requestId: "req-2",
  };
  let statusCode = 200;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };

  await challengeVerify(req, res);

  assert.equal(statusCode, 400);
  const records: any[] = (globalThis as any).__logRecords;
  const fail = records.find((r) => r.msg === "mfa.challenge.fail");
  assert.ok(fail, "falha deve ser logada");
  assert.equal(fail.payload.requestId, "req-2");
  assert.equal(fail.payload.reason, "replay");
});
