import crypto from "crypto";
import { getRedis } from "./redis.service";

const ttlSec = 60 * 60 * 24 * 90;

export async function setTrustedDevice(res: any, userId: string) {
  const tdid = crypto.randomUUID();
  const r: any = await getRedis();
  if (r) await r.setEx(`tdid:${tdid}`, ttlSec, JSON.stringify({ userId }));
  res.cookie("tdid", tdid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ttlSec * 1000,
    path: "/",
  });
  return tdid;
}

export async function getTrustedDevice(req: any) {
  const tdid = req.cookies?.tdid;
  if (!tdid) return null;
  const r: any = await getRedis();
  if (!r) return null;
  const v = await r.get(`tdid:${tdid}`);
  return v ? JSON.parse(v) : null;
}

export async function revokeTrustedDevice(req: any, res: any) {
  const tdid = req.cookies?.tdid;
  if (!tdid) return;
  const r: any = await getRedis();
  if (r) await r.del(`tdid:${tdid}`);
  res.clearCookie("tdid", { path: "/" });
}
