import { SignJWT, calculateJwkThumbprint, exportJWK, generateKeyPair, importJWK, type JWK } from "jose";

const STORAGE_KEY = "tm.dpop.keypair";

function base64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64Url(hash);
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  u.search = "";
  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }
  return u.toString();
}

async function ensureKeys(): Promise<{ privateKey: CryptoKey; publicJwk: JWK; jkt: string }> {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) {
    try {
      const parsed = JSON.parse(fromStorage) as {
        privateJwk: JWK;
        publicJwk: JWK;
        jkt: string;
      };
      const privateKey = await importJWK(parsed.privateJwk, "ES256");
      return { privateKey, publicJwk: parsed.publicJwk, jkt: parsed.jkt };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);
  const jkt = await calculateJwkThumbprint(publicJwk as JWK);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ privateJwk: privateJwk as JWK, publicJwk: publicJwk as JWK, jkt })
  );
  return { privateKey, publicJwk: publicJwk as JWK, jkt };
}

async function computeAth(token?: string | null): Promise<string | undefined> {
  if (!token) return undefined;
  const data = new TextEncoder().encode(token);
  return await sha256(data);
}

export async function createDpopProof(
  method: string,
  absoluteUrl: string,
  token?: string | null
): Promise<{ proof: string; jkt: string }> {
  const { privateKey, publicJwk, jkt } = await ensureKeys();
  const htm = method ? method.toUpperCase() : "GET";
  const htu = normalizeUrl(absoluteUrl);
  const ath = await computeAth(token);

  const payload: Record<string, unknown> = {
    htm,
    htu,
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
  };
  if (ath) payload.ath = ath;

  const proof = await new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: publicJwk })
    .sign(privateKey);

  return { proof, jkt };
}

export async function getDpopJkt(): Promise<string> {
  const { jkt } = await ensureKeys();
  return jkt;
}
