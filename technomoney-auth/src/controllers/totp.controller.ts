import { RequestHandler } from "express";
import { TotpService } from "../services/totp.service";
import { JwtService } from "../services/jwt.service";
import { setTrustedDevice } from "../services/trusted-device.service";
import { resetTotpLimiter } from "../middlewares/totpLimiter.middleware";
import QRCode from "qrcode";

const svc = new TotpService();
const jwt = new JwtService();

export const status: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string } | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const enrolled = await svc.status(u.id);
  res.json({ enrolled });
};

export const setupStart: RequestHandler = async (req: any, res) => {
  const u = req.user as
    | { id: string; username?: string; email?: string }
    | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const label = u.email || u.username || u.id;
  const data = await svc.setupStart(u.id, label);
  const qrDataUrl = await QRCode.toDataURL(data.otpauth);
  res.json({ secret: data.secret, otpauth: data.otpauth, qrDataUrl });
};

export const setupVerify: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string } | undefined;
  if (!u) {
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
  const u = req.user as { id: string } | undefined;
  if (!u) {
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
  const token = jwt.signAccess(u.id, { acr: "aal2", amr: ["pwd", "otp"] });
  res.json({ token, acr: "aal2" });
};
