import { RequestHandler } from "express";
import { TotpService } from "../services/totp.service";
import { setTrustedDevice } from "../services/trusted-device.service";
import { resetTotpLimiter } from "../middlewares/totpLimiter.middleware";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/auth.service";
import { buildRefreshCookie } from "../utils/cookie.util";
import { deriveSid, scheduleTokenExpiringSoon } from "../ws";

const svc = new TotpService();
const auth = new AuthService();
const cookieOpts = buildRefreshCookie();

export const status: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string; acr?: string; scope?: string[] } | undefined;
  if (!u || !isStepUpContext(u)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const enrolled = await svc.status(u.id);
  res.json({ enrolled });
};

export const setupStart: RequestHandler = async (req: any, res) => {
  const u = req.user as
    | {
        id: string;
        username?: string;
        email?: string;
        acr?: string;
        scope?: string[];
        token?: string;
      }
    | undefined;
  if (!u || !isStepUpContext(u)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const label =
    u.email ||
    u.username ||
    extractUsername(u.token) ||
    u.id;
  const data = await svc.setupStart(u.id, label);
  const qrDataUrl = await QRCode.toDataURL(data.otpauth);
  res.json({ secret: data.secret, otpauth: data.otpauth, qrDataUrl });
};

export const setupVerify: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string; acr?: string; scope?: string[] } | undefined;
  if (!u || !isStepUpContext(u)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const code = String(req.body?.code || "");
  const r = await svc.setupVerify(u.id, code);
  if (!r.enrolled) {
    res.status(400).json({ message: "Invalid code" });
    return;
  }
  res.json({ enrolled: true });
};

export const challengeVerify: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string; acr?: string; scope?: string[] } | undefined;
  if (!u || !isStepUpContext(u)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const code = String(req.body?.code || "");
  const r = await svc.challengeVerify(u.id, code);
  if (!r.verified) {
    res.status(400).json({ message: "Invalid code" });
    return;
  }
  await resetTotpLimiter(res);
  await setTrustedDevice(res, u.id);
  const username = extractUsername((u as any)?.token);
  const session = await auth.createSession(u.id, username, {
    acr: "aal2",
    amr: ["pwd", "otp"],
  });
  const sid = deriveSid(session.refresh);
  const exp = decodeExp(session.access);
  scheduleTokenExpiringSoon(sid, exp);
  res
    .cookie("refreshToken", session.refresh, cookieOpts)
    .json({ token: session.access, acr: "aal2", username });
};

const decodeExp = (token: string) => {
  try {
    const d: any = jwt.decode(token);
    return typeof d?.exp === "number" ? d.exp : 0;
  } catch {
    return 0;
  }
};

const isStepUpContext = (user: { acr?: string; scope?: string[] }) => {
  if (user.acr === "step-up" || user.acr === "aal2") return true;
  const scope = Array.isArray(user.scope) ? user.scope : [];
  return scope.includes("auth:stepup");
};

const extractUsername = (token: string | undefined | null): string | null => {
  if (!token) return null;
  try {
    const payload: any = jwt.decode(token);
    const uname =
      typeof payload?.username === "string"
        ? payload.username
        : typeof payload?.preferred_username === "string"
        ? payload.preferred_username
        : null;
    return uname;
  } catch {
    return null;
  }
};
