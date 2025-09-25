import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { runWithLogContext } from "../../utils/log/logging-context";

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
  id: string;
  username: string | null;
};

type StepUpResult = {
  token: string;
  acr: string;
  scope: string[];
  username: string | null;
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
  createSessionCalls: Array<[string, string | null, Record<string, unknown>]>;
  issueStepUpCalls: Array<[string, string | null]>;
  loginResult: LoginResult;
  createSessionResult: LoginResult & { access: string; refresh: string };
  issueStepUpResult: StepUpResult;
} & {
  login(email: string, password: string): Promise<LoginResult>;
  logout(refresh: string): Promise<void>;
  createSession(
    id: string,
    username: string | null,
    extra?: Record<string, unknown>,
  ): Promise<{
    access: string;
    refresh: string;
    username: string | null;
  }>;
  issueStepUpToken(
    id: string,
    username: string | null
  ): Promise<StepUpResult>;
  register(): Promise<never>;
  refresh(): Promise<never>;
  requestPasswordReset(): Promise<never>;
  resetPassword(): Promise<never>;
  requestEmailVerification(): Promise<never>;
  verifyEmail(): Promise<never>;
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
    createSessionCalls: [],
    issueStepUpCalls: [],
    loginResult: result,
    createSessionResult: {
      ...result,
      access: createJwt({ sub: result.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
      refresh: "refresh-token",
    },
    issueStepUpResult: {
      token: createJwt({ sub: result.id, scope: ["auth:stepup"], acr: "step-up" }),
      acr: "step-up",
      scope: ["auth:stepup"],
      username: result.username,
    },
    async login(email: string, password: string) {
      stub.loginCalls.push([email, password]);
      return stub.loginResult;
    },
    async logout(refresh: string) {
      stub.logoutCalls.push([refresh]);
    },
    async createSession(
      id: string,
      username: string | null,
      extra: Record<string, unknown> = {},
    ) {
      stub.createSessionCalls.push([id, username, { ...extra }]);
      return {
        access: stub.createSessionResult.access,
        refresh: stub.createSessionResult.refresh,
        username,
      };
    },
    async issueStepUpToken(id: string, username: string | null) {
      stub.issueStepUpCalls.push([id, username]);
      return stub.issueStepUpResult;
    },
    async register() {
      throw new Error("not used");
    },
    async refresh() {
      throw new Error("not used");
    },
    async requestPasswordReset() {
      throw new Error("not used");
    },
    async resetPassword() {
      throw new Error("not used");
    },
    async requestEmailVerification() {
      throw new Error("not used");
    },
    async verifyEmail() {
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
    id: "user-123",
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
  assert.strictEqual(authService.logoutCalls.length, 0);
  assert.strictEqual(totpService.statusCalls.length, 1);
  assert.strictEqual(authService.issueStepUpCalls.length, 1);
  assert.deepStrictEqual(authService.issueStepUpCalls[0], ["user-123", "Neo"]);
  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [401]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    stepUp: "enroll_totp",
    token: authService.issueStepUpResult.token,
    username: "Neo",
    acr: "step-up",
  });
});

test("login returns totp step-up with issued token", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({ id: "user-123", username: "Trinity" });
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
  assert.strictEqual(authService.logoutCalls.length, 0);
  assert.strictEqual(totpService.statusCalls.length, 1);
  assert.strictEqual(authService.issueStepUpCalls.length, 1);
  assert.deepStrictEqual(authService.issueStepUpCalls[0], ["user-123", "Trinity"]);
  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [401]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    stepUp: "totp",
    token: authService.issueStepUpResult.token,
    username: "Trinity",
    acr: "step-up",
  });
});

test("login reutiliza metadados do trusted device para emitir sessão AAL2", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({ id: "user-123", username: "Neo" });
  const totpService = createTotpServiceStub(true);
  const trustedDevice = createTrustedDeviceStub({
    userId: "user-123",
    acr: "aal2",
    amr: ["pwd", "otp", "otp"],
    issuedAt: 1700000000000,
  });
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
    cookies: { tdid: "device-abc" },
  } as unknown as Request;
  const res = makeResponse();

  await controller.login(req, res as Response, (() => {}) as any);

  assert.strictEqual(authService.loginCalls.length, 1);
  assert.strictEqual(totpService.statusCalls.length, 0);
  assert.strictEqual(authService.issueStepUpCalls.length, 0);
  assert.strictEqual(authService.createSessionCalls.length, 1);
  assert.deepStrictEqual(authService.createSessionCalls[0], [
    "user-123",
    "Neo",
    {
      acr: "aal2",
      amr: ["pwd", "otp"],
      trusted_device: true,
      trusted_device_id: "device-abc",
      trusted_device_issued_at: 1700000000000,
    },
  ]);
  assert.strictEqual(res.statusCalls.length, 0);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    token: authService.createSessionResult.access,
    username: "Neo",
  });
});

test("login define claims AAL2 padrão quando metadata não traz fatores", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({ id: "user-123", username: "Neo" });
  const totpService = createTotpServiceStub(true);
  const trustedDevice = createTrustedDeviceStub({ userId: "user-123" });
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
    cookies: { tdid: "device-def" },
  } as unknown as Request;
  const res = makeResponse();

  await controller.login(req, res as Response, (() => {}) as any);

  assert.strictEqual(authService.createSessionCalls.length, 1);
  assert.deepStrictEqual(authService.createSessionCalls[0], [
    "user-123",
    "Neo",
    {
      acr: "aal2",
      amr: ["pwd", "otp"],
      trusted_device: true,
      trusted_device_id: "device-def",
    },
  ]);
  assert.strictEqual(totpService.statusCalls.length, 0);
  assert.strictEqual(res.statusCalls.length, 0);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    token: authService.createSessionResult.access,
    username: "Neo",
  });
});

test("login returns 401 when auth service rejects with invalid credentials", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({ id: "", username: null });
  authService.login = async (email: string, password: string) => {
    authService.loginCalls.push([email, password]);
    const err = new Error("INVALID_CREDENTIALS") as Error & {
      code: string;
      status: number;
    };
    err.code = "INVALID_CREDENTIALS";
    err.status = 401;
    throw err;
  };
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
  assert.strictEqual(totpService.statusCalls.length, 0);
  assert.strictEqual(authService.issueStepUpCalls.length, 0);
  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [401]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    message: "Credenciais inválidas",
  });
});

test("login inclui requestId quando emissão de sessão falha", async (t) => {
  process.env.AUTH_CONTROLLER_SKIP_DEFAULT = "1";
  const controller = await import("../auth.controller");
  const authService = createAuthServiceStub({ id: "user-123", username: "Neo" });
  authService.createSession = async (
    id: string,
    username: string | null,
    extra: Record<string, unknown> = {},
  ) => {
    authService.createSessionCalls.push([id, username, { ...extra }]);
    const err = new Error("ISSUE_TOKENS_FAILED") as Error & {
      code: string;
      status: number;
    };
    err.code = "ISSUE_TOKENS_FAILED";
    err.status = 500;
    throw err;
  };
  const totpService = createTotpServiceStub(true);
  const trustedDevice = createTrustedDeviceStub({ userId: "user-123" });
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

  await runWithLogContext({ requestId: "req-123" }, async () => {
    await controller.login(req, res as Response, (() => {}) as any);
  });

  assert.strictEqual(res.statusCalls.length, 1);
  assert.deepStrictEqual(res.statusCalls[0], [500]);
  assert.strictEqual(res.jsonCalls.length, 1);
  assert.deepStrictEqual(res.jsonCalls[0][0], {
    message: "Falha ao emitir tokens",
    requestId: "req-123",
  });
  assert.strictEqual(authService.createSessionCalls.length, 1);
});
