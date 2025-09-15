import { TotpService } from "../services/totp.service";

const totp = new TotpService();

export const requireAAL2 = async (req: any, res: any, next: any) => {
  const u = req.user as { id?: string; acr?: string } | undefined;
  if (u && u.acr === "aal2") {
    next();
    return;
  }
  if (!u?.id) {
    res.status(401).json({ stepUp: "login" });
    return;
  }
  const t = await totp.status(u.id);
  if (t) {
    res.status(401).json({ stepUp: "totp" });
    return;
  }
  res.status(401).json({ stepUp: "enroll", options: ["totp"] });
};
