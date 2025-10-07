import csrf from "csurf";
import { RequestHandler } from "express";

const isProd = process.env.NODE_ENV === "production";

const base = csrf({
  cookie: { httpOnly: true, sameSite: "lax", secure: isProd },
});

export const csrfProtection: RequestHandler = (req, res, next) => {
  base(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    next();
  });
};
