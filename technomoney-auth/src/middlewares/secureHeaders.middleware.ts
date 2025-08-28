import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  objectSrc: ["'none'"],
};

export const secureHeaders = helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
  hsts: isProd ? { maxAge: 60 * 60 * 24 * 365 * 2, preload: true } : false,
});

export const forceHttps = (req: Request, res: Response, next: NextFunction) => {
  const host = (req.headers.host || "").toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1"))
    return next();
  if (req.secure) return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
