import { Request, Response } from "express";
import { issueTicket, deriveSid } from "../ws";

export const wsTicket = (req: Request, res: Response): void => {
  const user = (req as any).user as { id: string } | undefined;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const refresh = String((req as any).cookies?.refreshToken || "");
  const sid = refresh ? deriveSid(refresh) : `u:${user.id}`;
  const ticket = issueTicket(user.id, sid);
  const host = String(req.headers.host || "");
  const hfp = req.headers["x-forwarded-proto"];
  const hdrProto = Array.isArray(hfp) ? hfp[0] : hfp || "";
  const isSecure = (req as any).secure || hdrProto === "https";
  const proto = isSecure ? "wss" : "ws";
  res.json({ ticket, sid, wsUrl: `${proto}://${host}/api/auth/events` });
};
