import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";

const path = require("path");

const stubModule = (specifier: string, exports: unknown) => {
  let resolved: string;
  try {
    resolved = require.resolve(specifier);
  } catch {
    resolved = require.resolve(path.join(__dirname, `${specifier}.ts`));
  }
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
};

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

stubModule("../../utils/log/logger", {
  getLogger: () => noopLogger,
  logger: noopLogger,
});

let verifyAccessResult: any;
let sessionIsActive = true;

stubModule("../../services/jwt.service", {
  JwtService: class {
    verifyAccess() {
      if (!verifyAccessResult) {
        throw new Error("VERIFY_ACCESS_RESULT_NOT_SET");
      }
      return verifyAccessResult;
    }
  },
});

stubModule("../../services/session.service", {
  SessionService: class {
    async isActive() {
      return sessionIsActive;
    }
  },
});

type MockResponse = Response & {
  statusCalls: Array<[number]>;
  jsonCalls: Array<[unknown]>;
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
    statusCalls,
    jsonCalls,
  } as Partial<Response>;
  return res as MockResponse;
};

test("introspect returns active=true when session is active", async () => {
  const basic = Buffer.from("payments:secret").toString("base64");
  process.env.INTROSPECTION_CLIENTS = "payments:secret";
  verifyAccessResult = {
    id: "user-1",
    jti: "jti-1",
    sid: "sid-123",
    scope: "payments:write",
    username: "neo",
    email: "neo@matrix.io",
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "aal1",
    amr: ["pwd"],
  };
  sessionIsActive = true;
  const controllerModulePath = require.resolve("../oidc.controller");
  delete require.cache[controllerModulePath];
  const { introspectHandler } = await import("../oidc.controller");

  const req = {
    headers: { authorization: `Basic ${basic}` },
    body: { token: "access-token" },
    socket: {},
  } as unknown as Request;
  const res = makeResponse();

  await introspectHandler(req, res, () => {});

  assert.equal(res.statusCalls.length, 0);
  assert.equal(res.jsonCalls.length, 1);
  const payload = res.jsonCalls[0][0] as Record<string, unknown>;
  assert.equal(payload.active, true);
  assert.equal(payload.sub, "user-1");
  assert.equal(payload.sid, "sid-123");
  assert.equal(payload.scope, "payments:write");
});

test("introspect returns active=false when session was revoked", async () => {
  const basic = Buffer.from("payments:secret").toString("base64");
  process.env.INTROSPECTION_CLIENTS = "payments:secret";
  verifyAccessResult = {
    id: "user-1",
    jti: "jti-1",
    sid: "sid-123",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  sessionIsActive = false;
  const controllerModulePath = require.resolve("../oidc.controller");
  delete require.cache[controllerModulePath];
  const { introspectHandler } = await import("../oidc.controller");

  const req = {
    headers: { authorization: `Basic ${basic}` },
    body: { token: "access-token" },
    socket: {},
  } as unknown as Request;
  const res = makeResponse();

  await introspectHandler(req, res, () => {});

  assert.equal(res.statusCalls.length, 0);
  assert.equal(res.jsonCalls.length, 1);
  const payload = res.jsonCalls[0][0] as Record<string, unknown>;
  assert.equal(payload.active, false);
});
