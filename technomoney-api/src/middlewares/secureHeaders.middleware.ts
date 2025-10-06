import helmet from "helmet";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'none'"],
};

export const secureHeaders = helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
  xssFilter: true,
  noSniff: true,
});

export const forceHttps = (req: Request, res: Response, next: NextFunction) => {
  const host = (req.headers.host || "").toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    logger.debug({ host, path: req.originalUrl }, "https.skip_local");
    return next();
  }
  if (req.secure) {
    logger.debug({ host, path: req.originalUrl }, "https.already_secure");
    return next();
  }
  logger.info({ host, path: req.originalUrl }, "https.redirect");
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
