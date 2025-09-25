import crypto from "crypto";
import { getRedis } from "./redis.service";
import { keysService } from "./keys.service";

const ttlSec = 60 * 60 * 24 * 90;

export type TrustedDeviceMetadata = {
  acr?: string;
  amr?: string[];
  issuedAt?: number;
};

const TD_META_COOKIE = "tdmeta";

const base64urlEncode = (buffer: Buffer): string => buffer.toString("base64url");
const base64urlDecode = (value: string): Buffer =>
  Buffer.from(value, "base64url");

let redisGetter: typeof getRedis = getRedis;

export const __setTrustedDeviceDeps = (deps: {
  getRedis?: typeof getRedis;
}) => {
  if (deps.getRedis) redisGetter = deps.getRedis;
};

export const __resetTrustedDeviceDeps = () => {
  redisGetter = getRedis;
};

const sanitizePayload = (
  payload: Record<string, unknown>,
): (TrustedDeviceMetadata & { userId: string; tdid?: string }) | null => {
  if (!payload || typeof payload.userId !== "string") return null;
  const userId = payload.userId.trim();
  if (!userId) return null;
  const result: TrustedDeviceMetadata & { userId: string; tdid?: string } = {
    userId,
  };
  const acr = sanitizeAcr(payload.acr);
  const amr = sanitizeAmr(payload.amr);
  if (acr) result.acr = acr;
  if (amr) result.amr = amr;
  if (
    typeof payload.issuedAt === "number" &&
    Number.isFinite(payload.issuedAt)
  ) {
    result.issuedAt = payload.issuedAt;
  }
  if (typeof payload.tdid === "string" && payload.tdid.trim()) {
    result.tdid = payload.tdid.trim();
  }
  return result;
};

const metadataSecret = (): Buffer | null => {
  const raw = process.env.TRUSTED_DEVICE_SECRET;
  if (typeof raw === "string" && raw.trim().length >= 32) {
    return Buffer.from(raw.trim(), "utf8");
  }
  try {
    const { privatePem } = keysService.getActive();
    return crypto.createHash("sha256").update(privatePem).digest();
  } catch {
    return null;
  }
};

const encodeMetadata = (payload: Record<string, unknown>): string | null => {
  const secret = metadataSecret();
  if (!secret) return null;
  const data = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${base64urlEncode(data)}.${base64urlEncode(sig)}`;
};

const decodeMetadata = (token: unknown): Record<string, unknown> | null => {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [rawData, rawSig] = token.split(".");
  try {
    const data = base64urlDecode(rawData);
    const sig = base64urlDecode(rawSig);
    const secret = metadataSecret();
    if (!secret) return null;
    const expected = crypto.createHmac("sha256", secret).update(data).digest();
    if (expected.length !== sig.length) return null;
    if (!crypto.timingSafeEqual(expected, sig)) return null;
    const parsed = JSON.parse(data.toString("utf8"));
    return typeof parsed === "object" && parsed ? (parsed as any) : null;
  } catch {
    return null;
  }
};

const sanitizeAcr = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeAmr = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  if (!values.length) return undefined;
  return Array.from(new Set(values));
};

export async function setTrustedDevice(
  res: any,
  userId: string,
  metadata: TrustedDeviceMetadata = {},
) {
  const tdid = crypto.randomUUID();
  const payload: Record<string, unknown> = { userId, tdid };
  const acr = sanitizeAcr(metadata.acr);
  const amr = sanitizeAmr(metadata.amr);
  if (acr) payload.acr = acr;
  if (amr) payload.amr = amr;
  if (acr || amr) {
    payload.issuedAt = Date.now();
  }
  const r: any = await redisGetter();
  if (r) await r.setEx(`tdid:${tdid}`, ttlSec, JSON.stringify(payload));
  const encoded = encodeMetadata(payload);
  res.cookie("tdid", tdid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ttlSec * 1000,
    path: "/",
  });
  if (encoded) {
    res.cookie(TD_META_COOKIE, encoded, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ttlSec * 1000,
      path: "/",
    });
  }
  return tdid;
}

export async function getTrustedDevice(
  req: any,
): Promise<(TrustedDeviceMetadata & { userId: string }) | null> {
  const tdid = req.cookies?.tdid;
  if (!tdid) return null;
  const r: any = await redisGetter();
  if (r) {
    const v = await r.get(`tdid:${tdid}`);
    if (v) {
      try {
        const parsed = JSON.parse(v);
        const sanitized = sanitizePayload(parsed);
        if (sanitized && sanitized.userId) {
          const { tdid: _ignored, ...rest } = sanitized;
          return rest;
        }
      } catch {}
    }
  }
  const cookieMeta = decodeMetadata(req.cookies?.[TD_META_COOKIE]);
  const sanitized = sanitizePayload(cookieMeta || {});
  if (sanitized && sanitized.tdid === tdid) {
    const { tdid: _ignored, ...rest } = sanitized;
    return rest;
  }
  return null;
}

export async function revokeTrustedDevice(req: any, res: any) {
  const tdid = req.cookies?.tdid;
  if (!tdid) return;
  const r: any = await redisGetter();
  if (r) await r.del(`tdid:${tdid}`);
  res.clearCookie("tdid", { path: "/" });
  res.clearCookie(TD_META_COOKIE, { path: "/" });
}
