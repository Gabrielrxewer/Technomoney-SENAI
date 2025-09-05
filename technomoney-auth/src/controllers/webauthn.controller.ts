import { RequestHandler } from "express";
import { WebAuthnService } from "../services/webauthn.service";
import { JwtService } from "../services/jwt.service";

const svc = new WebAuthnService();
const jwt = new JwtService();

export const startRegistration: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string; username?: string } | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const opts = await svc.startRegistration(u.id, u.username || u.id);
  res.json(opts);
};

export const finishRegistration: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string } | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const ok = await svc.finishRegistration(u.id, req.body);
  if (!ok.verified) {
    res.status(400).json({ message: "Invalid attestation" });
    return;
  }
  res.json({ ok: true });
};

export const startAuthentication: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string } | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const opts = await svc.startAuthentication(u.id);
  res.json(opts);
};

export const finishAuthentication: RequestHandler = async (req: any, res) => {
  const u = req.user as { id: string } | undefined;
  if (!u) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const ok = await svc.finishAuthentication(u.id, req.body);
  if (!ok.verified) {
    res.status(400).json({ message: "Invalid assertion" });
    return;
  }
  const token = jwt.signAccess(u.id, {
    acr: "urn:technomoney:aal2",
    amr: ["wba"],
  });
  res.json({ token, acr: "urn:technomoney:aal2" });
};
