import jwt, { VerifyOptions } from "jsonwebtoken";
import { logger } from "../utils/logger";

const parseAudienceVerify = (
  v?: string
): string | [string | RegExp, ...(string | RegExp)[]] | undefined => {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  const parts = t.includes(",")
    ? t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [t];
  if (parts.length === 1) return parts[0];
  const tuple = [parts[0], ...parts.slice(1)] as [string, ...string[]];
  return tuple;
};

export const authenticate = (req: any, res: any, next: any) => {
  const xff = req.headers["x-forwarded-for"];
  const remoteip =
    (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() || req.ip;
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    logger.warn({ path: req.path, remoteip }, "auth.middleware.missing_token");
    res.status(401).json({ message: "Access denied" });
    return;
  }
  try {
    const opts: VerifyOptions = {
      algorithms: ["HS256"],
      issuer: "technomoney-auth",
    };
    const aud = parseAudienceVerify(process.env.JWT_AUDIENCE);
    if (aud) opts.audience = aud;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      opts
    ) as any;
    req.user = decoded;
    logger.debug({ path: req.path, remoteip }, "auth.middleware.ok");
    next();
  } catch {
    logger.warn({ path: req.path, remoteip }, "auth.middleware.invalid_token");
    res.status(400).json({ message: "Invalid token" });
  }
};
