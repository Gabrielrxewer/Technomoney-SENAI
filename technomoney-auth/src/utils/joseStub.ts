import { generateKeyPair as generatePair } from "crypto";

type Jwk = { crv: string; kty: string; x: string; y: string };

function b64urlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(str: string) {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(normalized, "base64");
}

class SignJWT {
  private payload: Record<string, unknown>;
  private header: Record<string, unknown> = { alg: "ES256", typ: "JWT" };
  constructor(payload: Record<string, unknown>) {
    this.payload = payload;
  }
  setProtectedHeader(header: Record<string, unknown>) {
    this.header = { ...this.header, ...header };
    return this;
  }
  async sign() {
    const header = b64urlEncode(JSON.stringify(this.header));
    const payload = b64urlEncode(JSON.stringify(this.payload));
    return `${header}.${payload}.signature`;
  }
}

async function generateKeyPair(alg: string) {
  if (alg !== "ES256") {
    throw new Error("unsupported alg");
  }
  return new Promise((resolve, reject) => {
    generatePair(
      "ec",
      { namedCurve: "P-256" },
      (err, publicKey, privateKey) => {
        if (err) return reject(err);
        resolve({ publicKey, privateKey });
      }
    );
  });
}

async function exportJWK(key: any): Promise<Jwk> {
  return key.export({ format: "jwk" }) as Jwk;
}

async function calculateJwkThumbprint(jwk: Jwk) {
  const ordered = {
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  };
  return b64urlEncode(JSON.stringify(ordered));
}

async function importJWK(jwk: Jwk) {
  return jwk;
}

async function jwtVerify(token: string) {
  const [headerPart, payloadPart] = token.split(".");
  if (!headerPart || !payloadPart) throw new Error("invalid token");
  const protectedHeader = JSON.parse(b64urlDecode(headerPart).toString("utf8"));
  const payload = JSON.parse(b64urlDecode(payloadPart).toString("utf8"));
  return { payload, protectedHeader };
}

export function joseStub() {
  return {
    SignJWT,
    generateKeyPair,
    exportJWK,
    calculateJwkThumbprint,
    importJWK,
    jwtVerify,
  };
}
