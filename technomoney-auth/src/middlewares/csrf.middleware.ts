import csrf from "csurf";
import { RequestHandler } from "express";
import { logger } from "../utils/logger";

const isProd = process.env.NODE_ENV === "production";

const base = csrf({
  cookie: { httpOnly: true, sameSite: "lax", secure: isProd },
});

export const csrfProtection: RequestHandler = (req, res, next) => {
  base(req, res, (err) => {
    if (err) {
      logger.warn({ path: req.path, code: (err as any).code }, "csrf.blocked");
      next(err);
      return;
    }
    logger.debug({ path: req.path, method: req.method }, "csrf.ok");
    next();
  });
};
