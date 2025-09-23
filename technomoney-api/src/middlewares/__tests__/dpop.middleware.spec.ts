import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
} from "jose";
import { requireDPoPIfBound } from "../dpop.middleware";

type Req = {
  protocol: string;
  method: string;
  originalUrl: string;
  headers: Record<string, string>;
  get: (name: string) => string;
  user?: any;
};

type Res = {
  statusCode?: number;
  body?: any;
  status: (code: number) => Res;
  json: (body: any) => Res;
};

test("requireDPoPIfBound allows requests with matching ath", async () => {
  const token = "token-value";
  const { req, res, next, flags } = await setup(token, true);
  await requireDPoPIfBound(req, res, next);
  assert.equal(res.statusCode, undefined);
  assert.equal(flags.calledNext, true);
});

test("requireDPoPIfBound rejects bound tokens without proof header", async () => {
  const token = "token-value";
  const method = "GET";
  const host = "api.example.com";
  const path = "/resource";
  const req: Req = {
    protocol: "https",
    method,
    originalUrl: `${path}?foo=bar`,
    headers: {},
    get: (name: string) => {
      if (name.toLowerCase() === "host") return host;
      throw new Error(`unexpected header ${name}`);
    },
    user: {
      token,
      payload: { cnf: { jkt: "thumb" } },
    },
  };
  const res: Res = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
  const flags = { calledNext: false };
  const next = () => {
    flags.calledNext = true;
  };

  await requireDPoPIfBound(req, res, next);

  assert.equal(flags.calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "DPoP required" });
});

test("requireDPoPIfBound rejects requests with mismatching ath", async () => {
  const token = "token-value";
  const { req, res, next, flags } = await setup(token, false);
  await requireDPoPIfBound(req, res, next);
  assert.equal(flags.calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "invalid dpop ath" });
});

async function setup(token: string, correctAth: boolean) {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = await exportJWK(publicKey);
  const jkt = await calculateJwkThumbprint(jwk);
  const method = "GET";
  const host = "api.example.com";
  const path = "/resource";
  const htu = `https://${host}${path}`;
  const ath = hashToken(correctAth ? token : `${token}-wrong`);
  const proof = await new SignJWT({
    htm: method,
    htu,
    iat: Math.floor(Date.now() / 1000),
    jti: randomUUID(),
    ath,
  })
    .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk })
    .sign(privateKey);

  const req: Req = {
    protocol: "https",
    method,
    originalUrl: `${path}?foo=bar`,
    headers: { dpop: proof },
    get: (name: string) => {
      if (name.toLowerCase() === "host") return host;
      throw new Error(`unexpected header ${name}`);
    },
    user: {
      token,
      payload: { cnf: { jkt } },
    },
  };

  const res: Res = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };

  const flags = { calledNext: false };
  const next = () => {
    flags.calledNext = true;
  };

  return { req, res, next, flags };
}

function hashToken(token: string) {
  const base64 = createHash("sha256").update(token).digest("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
