import assert from "node:assert/strict";
import test from "node:test";

import { safeErr } from "../../log/log.helpers";

const originalEnv = { ...process.env };

const restoreEnv = () => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (typeof originalEnv.AUTH_VERBOSE_ERRORS === "undefined") {
    delete process.env.AUTH_VERBOSE_ERRORS;
  } else {
    process.env.AUTH_VERBOSE_ERRORS = originalEnv.AUTH_VERBOSE_ERRORS;
  }
};

test("safeErr omits verbose details in production by default", (t) => {
  process.env.NODE_ENV = "production";
  delete process.env.AUTH_VERBOSE_ERRORS;
  t.after(restoreEnv);

  const err = new Error("boom");
  const payload = safeErr(err);

  assert.equal(payload.message, "boom");
  assert.equal("stack" in payload, false);
  assert.equal("cause" in payload, false);
  assert.equal("originalError" in payload, false);
});

test("safeErr includes stack and nested cause when verbose errors enabled", (t) => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_VERBOSE_ERRORS = "1";
  t.after(restoreEnv);

  const inner = new Error("root cause");
  const err = new Error("boom");
  (err as Error & { cause?: unknown; originalError?: unknown }).cause = inner;
  (err as Error & { cause?: unknown; originalError?: unknown }).originalError =
    new Error("db failed");

  const payload = safeErr(err);

  assert.equal(payload.message, "boom");
  assert.equal(typeof payload.stack, "string");
  assert.ok(payload.stack.includes("boom"));
  assert.ok(payload.cause && typeof payload.cause === "object");
  assert.equal((payload.cause as Record<string, unknown>).message, "root cause");
  assert.ok(
    payload.originalError && typeof payload.originalError === "object",
    "expected originalError to be serialized"
  );
  assert.equal(
    (payload.originalError as Record<string, unknown>).message,
    "db failed"
  );
});

test("safeErr surfaces stack automatically in non-production", (t) => {
  process.env.NODE_ENV = "development";
  delete process.env.AUTH_VERBOSE_ERRORS;
  t.after(restoreEnv);

  const err = new Error("non prod boom");
  const payload = safeErr(err);

  assert.equal(payload.message, "non prod boom");
  assert.equal(typeof payload.stack, "string");
});
