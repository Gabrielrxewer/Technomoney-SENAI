import assert from "node:assert/strict";
import test from "node:test";

import type { Request, Response, NextFunction } from "express";

import {
  requireAAL2,
  resetTotpService,
  setTotpService,
} from "../requireAAL2.middleware";

type MutableResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

test("allows requests when acr already satisfies aal2", async () => {
  const req = buildRequest({ acr: "aal2" });
  const res = buildResponse();
  const flags = { calledNext: false };
  const next: NextFunction = () => {
    flags.calledNext = true;
  };

  await requireAAL2(req, res, next);

  assert.equal(flags.calledNext, true);
  assert.equal(res.statusCode, undefined);
});

test("rejects when user is missing", async () => {
  const req = buildRequest(undefined);
  const res = buildResponse();
  const flags = { calledNext: false };

  await requireAAL2(req, res, () => {
    flags.calledNext = true;
  });

  assert.equal(flags.calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { stepUp: "login" });
});

test("requests step-up totp when enrollment exists", async () => {
  const req = buildRequest({ id: "user-1", acr: "aal1" });
  const res = buildResponse();
  const flags = { calledNext: false };

  setTotpService({
    async status(userId: string) {
      assert.equal(userId, "user-1");
      return true;
    },
  });

  await requireAAL2(req, res, () => {
    flags.calledNext = true;
  });

  assert.equal(flags.calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { stepUp: "totp" });

  resetTotpService();
});

test("requests totp enrollment when no second factor is active", async () => {
  const req = buildRequest({ id: "user-2", acr: "aal1" });
  const res = buildResponse();
  const flags = { calledNext: false };

  setTotpService({
    async status(userId: string) {
      assert.equal(userId, "user-2");
      return false;
    },
  });

  await requireAAL2(req, res, () => {
    flags.calledNext = true;
  });

  assert.equal(flags.calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { stepUp: "enroll", options: ["totp"] });

  resetTotpService();
});

function buildRequest(user?: Partial<Request["user"]>) {
  return {
    user: user as Request["user"],
  } as Request;
}

function buildResponse(): MutableResponse {
  const res: Partial<MutableResponse> = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res as MutableResponse;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res as MutableResponse;
  };
  return res as MutableResponse;
}
