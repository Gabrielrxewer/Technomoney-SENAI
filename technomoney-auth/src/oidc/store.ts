import Redis from "ioredis";
import crypto from "crypto";
type Code = {
  sub: string;
  client_id: string;
  redirect_uri: string;
  scope: string[];
  code_challenge: string;
  code_method: "S256";
  nonce?: string;
  acr?: string;
  jkt?: string;
  exp: number;
};
type Par = { params: Record<string, string>; client_id: string; exp: number };
type Replay = { exp: number };
const url = process.env.REDIS_URL || "";
const useRedis = !!url;
const r = useRedis ? new Redis(url) : null;
const mem = new Map<string, any>();
function rid() {
  return crypto.randomBytes(16).toString("base64url");
}
export async function savePAR(
  client_id: string,
  params: Record<string, string>,
  ttlSec: number
) {
  const uri = `urn:request_uri:${rid()}`;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const val: Par = { params, client_id, exp };
  if (r) await r.setex(`par:${uri}`, ttlSec, JSON.stringify(val));
  else mem.set(`par:${uri}`, val);
  return { request_uri: uri, expires_in: ttlSec };
}
export async function getPAR(uri: string) {
  if (r) {
    const v = await r.get(`par:${uri}`);
    return v ? (JSON.parse(v) as Par) : null;
  }
  const v = mem.get(`par:${uri}`);
  return v || null;
}
export async function saveCode(code: string, value: Code, ttlSec: number) {
  if (r) await r.setex(`code:${code}`, ttlSec, JSON.stringify(value));
  else mem.set(`code:${code}`, value);
}
export async function takeCode(code: string) {
  if (r) {
    const k = `code:${code}`;
    const v = await r.get(k);
    if (!v) return null;
    await r.del(k);
    return JSON.parse(v) as Code;
  }
  const v = mem.get(`code:${code}`);
  if (!v) return null;
  mem.delete(`code:${code}`);
  return v as Code;
}
export async function markReplay(jti: string, ttlSec: number) {
  if (r) await r.setex(`dpop:${jti}`, ttlSec, "1");
  else
    mem.set(`dpop:${jti}`, {
      exp: Math.floor(Date.now() / 1000) + ttlSec,
    } as Replay);
}
export async function isReplay(jti: string) {
  if (r) return !!(await r.get(`dpop:${jti}`));
  const v = mem.get(`dpop:${jti}`) as Replay | undefined;
  if (!v) return false;
  if (v.exp < Math.floor(Date.now() / 1000)) {
    mem.delete(`dpop:${jti}`);
    return false;
  }
  return true;
}
export function genCode() {
  return rid();
}
