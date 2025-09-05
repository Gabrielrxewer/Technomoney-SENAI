import helmet from "helmet";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export const secureHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  (res as any).locals = (res as any).locals || {};
  (res as any).locals.cspNonce = nonce;
  const directives: any = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`],
    objectSrc: ["'none'"],
    imgSrc: ["'self'", "data:"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    baseUri: ["'self'"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  };
  res.setHeader("Referrer-Policy", "no-referrer");
  return helmet({ contentSecurityPolicy: { directives } })(req, res, next);
};

export const forceHttps = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path || req.url || "";
  if (path.startsWith("/.well-known/")) return next();
  const host = String(req.headers.host || "").toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1"))
    return next();
  if (req.secure) return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
