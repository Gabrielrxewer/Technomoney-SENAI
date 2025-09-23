import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

type FetchMock = (
  input: unknown,
  init?: unknown
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}>;

class MockResponse {
  public statusCode: number | undefined;
  public body: unknown;
  public headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: unknown) {
    this.body = data;
    return this;
  }

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }
}

const originalFetch = global.fetch;

async function loadAuthenticate() {
  const modulePath = require.resolve("../auth.middleware");
  delete require.cache[modulePath];
  const mod = await import("../auth.middleware");
  return mod.authenticate;
}

beforeEach(() => {
  process.env.AUTH_INTROSPECTION_URL = "https://auth.local/oauth2/introspect";
  process.env.AUTH_INTROSPECTION_CLIENT_ID = "client";
  process.env.AUTH_INTROSPECTION_CLIENT_SECRET = "secret";
});

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete (globalThis as { fetch?: typeof global.fetch }).fetch;
  }
  delete process.env.AUTH_INTROSPECTION_URL;
  delete process.env.AUTH_INTROSPECTION_CLIENT_ID;
  delete process.env.AUTH_INTROSPECTION_CLIENT_SECRET;
});

test("authenticate allows active tokens", async () => {
  const req: any = {
    headers: {
      authorization: "Bearer valid-token",
    },
  };
  const res = new MockResponse();
  let nextCalled = false;

  const fetchMock: FetchMock = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      active: true,
      sub: "user-123",
      jti: "jti-1",
      scope: "payments:read payments:write",
      username: "alice",
      exp: 1_700_000_000,
    }),
  });

  global.fetch = fetchMock as any;

  const authenticate = await loadAuthenticate();

  await authenticate(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, "next should have been called");
  assert.deepEqual(req.user.scope, ["payments:read", "payments:write"]);
  assert.equal(req.user.id, "user-123");
  assert.equal(req.user.username, "alice");
  assert.equal(req.user.jti, "jti-1");
  assert.equal(req.user.exp, 1_700_000_000);
  assert.equal(res.statusCode, undefined);
});

test("authenticate rejects inactive tokens", async () => {
  const req: any = {
    headers: {
      authorization: "Bearer revoked-token",
    },
  };
  const res = new MockResponse();
  let nextCalled = false;

  const fetchMock: FetchMock = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      active: false,
    }),
  });

  global.fetch = fetchMock as any;

  const authenticate = await loadAuthenticate();

  await authenticate(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false, "inactive token must not continue");
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "Unauthorized" });
  assert.match(
    res.headers["WWW-Authenticate"],
    /error="invalid_token"/i,
    "inactive token should emit invalid_token"
  );
});

test("authenticate responds with 401 when introspection fails", async () => {
  const req: any = {
    headers: {
      authorization: "Bearer unknown-token",
    },
  };
  const res = new MockResponse();
  let nextCalled = false;

  const fetchMock: FetchMock = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  });

  global.fetch = fetchMock as any;

  const authenticate = await loadAuthenticate();

  await authenticate(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false, "failed introspection must not continue");
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "Unauthorized" });
});
