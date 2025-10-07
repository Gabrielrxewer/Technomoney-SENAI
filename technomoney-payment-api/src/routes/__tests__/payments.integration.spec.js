const assert = require("node:assert/strict");
const test = require("node:test");

const maskToken = (token) =>
  !token ? "" : token.length <= 10 ? "***" : `${token.slice(0, 4)}...${token.slice(-4)}`;

async function requireAuth(req, res, next) {
  let tokenForLog = "";
  try {
    const header = String(req.header("authorization") || "");
    if (!header.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing bearer token" });
      return;
    }
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      res.status(401).json({ error: "invalid bearer token" });
      return;
    }
    tokenForLog = token;
    const url = process.env.AUTH_INTROSPECTION_URL;
    if (!url) throw new Error("AUTH_INTROSPECTION_URL is not configured");
    const clientId = process.env.AUTH_INTROSPECTION_CLIENT_ID || "";
    const clientSecret = process.env.AUTH_INTROSPECTION_CLIENT_SECRET || "";
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (clientId && clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }
    const body = new URLSearchParams({ token, token_type_hint: "access_token" });
    const response = await fetch(url, { method: "POST", headers, body });
    if (!response.ok) throw new Error(`introspection request failed with status ${response.status}`);
    const result = await response.json();
    if (!result.active) {
      res.status(401).json({ error: "token is not active" });
      return;
    }
    req.auth = result;
    next();
  } catch (err) {
    console.error("introspection failed for token", maskToken(tokenForLog), err);
    res.status(401).json({ error: "token introspection failed" });
  }
}

function makeReq(headers) {
  const store = { ...headers };
  return {
    header(name) {
      const key = Object.keys(store).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? store[key] : undefined;
    },
    auth: undefined,
  };
}

function makeRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test("requireAuth calls next when introspection is active", async () => {
  process.env.AUTH_INTROSPECTION_URL = "https://auth.local/oauth2/introspect";
  process.env.AUTH_INTROSPECTION_CLIENT_ID = "payments";
  process.env.AUTH_INTROSPECTION_CLIENT_SECRET = "secret";

  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    fetchCalls.push({ input, init });
    return new Response(JSON.stringify({ active: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const req = makeReq({ authorization: "Bearer token-123" });
  const res = makeRes();
  const flags = { calledNext: false };
  await requireAuth(req, res, () => {
    flags.calledNext = true;
  });

  assert.equal(flags.calledNext, true);
  assert.equal(res.statusCode, undefined);
  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0].init.headers.Authorization,
    `Basic ${Buffer.from("payments:secret").toString("base64")}`
  );

  global.fetch = originalFetch;
});

test("requireAuth responds 401 when introspection reports inactive", async () => {
  process.env.AUTH_INTROSPECTION_URL = "https://auth.local/oauth2/introspect";
  process.env.AUTH_INTROSPECTION_CLIENT_ID = "payments";
  process.env.AUTH_INTROSPECTION_CLIENT_SECRET = "secret";

  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ active: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const req = makeReq({ authorization: "Bearer token-456" });
  const res = makeRes();
  await requireAuth(req, res, () => {
    throw new Error("should not call next");
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "token is not active" });

  global.fetch = originalFetch;
});
