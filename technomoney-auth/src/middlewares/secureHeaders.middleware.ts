import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc : ["'self'"],
  objectSrc : ["'none'"],
};

export const secureHeaders = helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
  hsts: { maxAge: 60 * 60 * 24 * 365 * 2, preload: true },
});

export const forceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (req.secure) return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
