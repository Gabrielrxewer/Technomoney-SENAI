import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";

const stubModule = (specifier: string, exports: unknown) => {
  const resolved = require.resolve(specifier);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
};

stubModule("../../utils/log/logger", {
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
    child: () => ({ info: () => {}, error: () => {}, warn: () => {} }),
  },
});

stubModule("../../ws", {
  deriveSid: () => "sid",
  publishToSid: () => {},
  publishToUser: () => {},
  scheduleTokenExpiringSoon: () => {},
  clearSessionSchedules: () => {},
});

stubModule("../../services/trusted-device.service", {
  getTrustedDevice: async () => null,
});

type MockResponse = Response & {
  statusCalls: Array<[number]>;
  jsonCalls: Array<[unknown]>;
};

type LoginResult = {
  access: string;
  refresh: string;
  username?: string | null;
};

const createJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
};

const makeResponse = (): MockResponse => {
  const statusCalls: Array<[number]> = [];
  const jsonCalls: Array<[unknown]> = [];
  const res = {
    status(code: number) {
      statusCalls.push([code]);
      return this;
    },
    json(payload: unknown) {
      jsonCalls.push([payload]);
      return this;
    },
    cookie() {
      return this;
    },
    statusCalls,
    jsonCalls,
  };
  return res as unknown as MockResponse;
};

type AuthServiceStub = {
  loginCalls: Array<[string, string]>;
  logoutCalls: Array<[string]>;
  loginResult: LoginResult;
} & {
  login(email: string, password: string): Promise<LoginResult>;
  logout(refresh: string): Promise<void>;
  register(): Promise<never>;
  refresh(): Promise<never>;
};

type TotpServiceStub = {
  statusCalls: Array<[string]>;
  statusResult: boolean;
} & {
  status(userId: string): Promise<boolean>;
};

type TrustedDeviceStub = {
  result: any;
  calls: Array<[unknown]>;
} & ((req: unknown) => Promise<any>);

const createAuthServiceStub = (result: LoginResult): AuthServiceStub => {
  const stub: AuthServiceStub = {
    loginCalls: [],
    logoutCalls: [],
    loginResult: result,
    async login(email: string, password: string) {
      stub.loginCalls.push([email, password]);
      return stub.loginResult;
    },
    async logout(refresh: string) {
      stub.logoutCalls.push([refresh]);
    },
    async register() {
      throw new Error("not used");
    },
    async refresh() {
      throw new Error("not used");
    },
  } as AuthServiceStub;
  return stub;
};

const createTotpServiceStub = (statusResult: boolean): TotpServiceStub => {
  const stub: TotpServiceStub = {
    statusCalls: [],
    statusResult,
    async status(userId: string) {
      stub.statusCalls.push([userId]);
      return stub.statusResult;
    },
  } as TotpServiceStub;
  return stub;
};

const createTrustedDeviceStub = (value: any): TrustedDeviceStub => {
  const fn = (async (req: unknown) => {
    fn.calls.push([req]);
    return fn.result;
  }) as TrustedDeviceStub;
  fn.result = value;
  fn.calls = [];
  return fn;
};

test("login returns enroll_totp step-up with issued token", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({
    access: createJwt({
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    refresh: "refresh-token",
    username: "Neo",
  });
  const totpService = createTotpServiceStub(false);
  const trustedDevice = createTrustedDeviceStub(null);
  controller.__setAuthControllerDeps({
    authService,
    totpService,
    getTrustedDevice: trustedDevice,
  });
  t.after(() => {
    controller.__resetAuthControllerDeps();
  });
  const req = {
    body: { email: "user@example.com", password: "secret" },
  } as Request;
  const res = makeResponse();

  await controller.login(req, res as Response, (() => {}) as any);

  assert.strictEqual(authService.loginCalls.length, 1);
  assert.strictEqual(authService.logoutCalls.length, 1);
  assert.deepStrictEqual(authService.logoutCalls[0], ["refresh-token"]);
  assert.strictEqual(totpService.statusCalls.length, 1);
  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [401]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    stepUp: "enroll_totp",
    token: authService.loginResult.access,
    username: "Neo",
  });
});

test("login returns totp step-up with issued token", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({
    access: createJwt({
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    refresh: "refresh-token",
    username: "Trinity",
  });
  const totpService = createTotpServiceStub(true);
  const trustedDevice = createTrustedDeviceStub(null);
  controller.__setAuthControllerDeps({
    authService,
    totpService,
    getTrustedDevice: trustedDevice,
  });
  t.after(() => {
    controller.__resetAuthControllerDeps();
  });
  const req = {
    body: { email: "user@example.com", password: "secret" },
  } as Request;
  const res = makeResponse();

  await controller.login(req, res as Response, (() => {}) as any);

  assert.strictEqual(authService.loginCalls.length, 1);
  assert.strictEqual(authService.logoutCalls.length, 1);
  assert.deepStrictEqual(authService.logoutCalls[0], ["refresh-token"]);
  assert.strictEqual(totpService.statusCalls.length, 1);
  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [401]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    stepUp: "totp",
    token: authService.loginResult.access,
    username: "Trinity",
  });
});
