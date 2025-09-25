import crypto from "crypto";
import { getRedis } from "./redis.service";

const ttlSec = 60 * 60 * 24 * 90;

export type TrustedDeviceMetadata = {
  acr?: string;
  amr?: string[];
  issuedAt?: number;
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
  const payload: Record<string, unknown> = { userId };
  const acr = sanitizeAcr(metadata.acr);
  const amr = sanitizeAmr(metadata.amr);
  if (acr) payload.acr = acr;
  if (amr) payload.amr = amr;
  if (acr || amr) {
    payload.issuedAt = Date.now();
  }
  const r: any = await getRedis();
  if (r) await r.setEx(`tdid:${tdid}`, ttlSec, JSON.stringify(payload));
  res.cookie("tdid", tdid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ttlSec * 1000,
    path: "/",
  });
  return tdid;
}

export async function getTrustedDevice(
  req: any,
): Promise<(TrustedDeviceMetadata & { userId: string }) | null> {
  const tdid = req.cookies?.tdid;
  if (!tdid) return null;
  const r: any = await getRedis();
  if (!r) return null;
  const v = await r.get(`tdid:${tdid}`);
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (!parsed || typeof parsed.userId !== "string" || !parsed.userId.trim()) {
      return null;
    }
    const result: TrustedDeviceMetadata & { userId: string } = {
      userId: parsed.userId,
    };
    const acr = sanitizeAcr(parsed.acr);
    const amr = sanitizeAmr(parsed.amr);
    if (acr) result.acr = acr;
    if (amr) result.amr = amr;
    if (typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)) {
      result.issuedAt = parsed.issuedAt;
    }
    return result;
  } catch {
    return null;
  }
}

export async function revokeTrustedDevice(req: any, res: any) {
  const tdid = req.cookies?.tdid;
  if (!tdid) return;
  const r: any = await getRedis();
  if (r) await r.del(`tdid:${tdid}`);
  res.clearCookie("tdid", { path: "/" });
}
