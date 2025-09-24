import { RequestHandler } from "express";
import { TotpService } from "../services/totp.service";
import { setTrustedDevice } from "../services/trusted-device.service";
import { resetTotpLimiter } from "../middlewares/totpLimiter.middleware";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/auth.service";
import { buildRefreshCookie } from "../utils/cookie.util";
import { deriveSid, scheduleTokenExpiringSoon } from "../ws";
import { logger } from "../utils/log/logger";
import { mask } from "../utils/log/log.helpers";

type TotpServiceContract = Pick<
  TotpService,
  "status" | "setupStart" | "setupVerify" | "challengeVerify"
>;
type AuthServiceContract = Pick<AuthService, "createSession">;

let svc: TotpServiceContract = new TotpService();
let auth: AuthServiceContract = new AuthService();
let cookieOpts = buildRefreshCookie();
let setTrustedDeviceImpl = setTrustedDevice;
let resetTotpLimiterImpl = resetTotpLimiter;
let deriveSidImpl = deriveSid;
let scheduleTokenExpiringSoonImpl = scheduleTokenExpiringSoon;

export const __setTotpControllerDeps = (deps: {
  totpService?: TotpServiceContract;
  authService?: AuthServiceContract;
  cookieOptions?: ReturnType<typeof buildRefreshCookie>;
  setTrustedDevice?: typeof setTrustedDevice;
  resetTotpLimiter?: typeof resetTotpLimiter;
  deriveSid?: typeof deriveSid;
  scheduleTokenExpiringSoon?: typeof scheduleTokenExpiringSoon;
}) => {
  if (deps.totpService) svc = deps.totpService;
  if (deps.authService) auth = deps.authService;
  if (deps.cookieOptions) cookieOpts = deps.cookieOptions;
  if (deps.setTrustedDevice) setTrustedDeviceImpl = deps.setTrustedDevice;
  if (deps.resetTotpLimiter) resetTotpLimiterImpl = deps.resetTotpLimiter;
  if (deps.deriveSid) deriveSidImpl = deps.deriveSid;
  if (deps.scheduleTokenExpiringSoon)
    scheduleTokenExpiringSoonImpl = deps.scheduleTokenExpiringSoon;
};

export const __resetTotpControllerDeps = () => {
  svc = new TotpService();
  auth = new AuthService();
  cookieOpts = buildRefreshCookie();
  setTrustedDeviceImpl = setTrustedDevice;
  resetTotpLimiterImpl = resetTotpLimiter;
  deriveSidImpl = deriveSid;
  scheduleTokenExpiringSoonImpl = scheduleTokenExpiringSoon;
};

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
    logger.warn(
      {
        requestId: req.requestId,
        userId: mask(u.id),
      },
      "mfa.enroll.fail"
    );
    res.status(400).json({ message: "Invalid code" });
    return;
  }
  logger.info(
    {
      requestId: req.requestId,
      userId: mask(u.id),
    },
    "mfa.enroll.success"
  );
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
    logger.warn(
      {
        requestId: req.requestId,
        userId: mask(u.id),
        reason: r.reason || "invalid",
      },
      "mfa.challenge.fail"
    );
    res.status(400).json({ message: "Invalid code" });
    return;
  }
  logger.info(
    {
      requestId: req.requestId,
      userId: mask(u.id),
    },
    "mfa.challenge.success"
  );
  await resetTotpLimiterImpl(res);
  await setTrustedDeviceImpl(res, u.id);
  const username = extractUsername((u as any)?.token);
  const session = await auth.createSession(u.id, username, {
    acr: "aal2",
    amr: ["pwd", "otp"],
  });
  const sid = deriveSidImpl(session.refresh);
  const exp = decodeExp(session.access);
  scheduleTokenExpiringSoonImpl(sid, exp);
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
