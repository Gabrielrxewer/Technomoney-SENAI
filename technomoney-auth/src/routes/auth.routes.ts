import { Router, type RequestHandler } from "express";
import { loginLimiter } from "../middlewares/rateLimit.middleware";
import { loginByEmailLimiter } from "../middlewares/rateLimitByEmail.middleware";
import {
  recaptchaFor,
  requireRecaptcha,
} from "../middlewares/recaptcha.middleware";
import {
  login,
  register,
  me,
  refresh,
  logout,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { enforcePasswordPolicy } from "../middlewares/passwordPolicy.middleware";
import { csrfProtection } from "../middlewares/csrf.middleware";
import { wsTicket } from "../controllers/ws.controller";

const router = Router();

router.post(
  "/login",
  loginLimiter,
  loginByEmailLimiter,
  requireRecaptcha,
  csrfProtection,
  login
);
router.post(
  "/register",
  loginByEmailLimiter,
  recaptchaFor("register"),
  enforcePasswordPolicy,
  csrfProtection,
  register
);
router.post("/refresh", csrfProtection, refresh);
router.post("/logout", csrfProtection, logout);
router.post("/ws-ticket", authenticate, wsTicket);

const csrfGet: RequestHandler = (req: any, res) => {
  const token = typeof req.csrfToken === "function" ? req.csrfToken() : "";
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("csrf", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: isProd,
  });
  res.json({ csrfToken: token });
};
router.get("/csrf", csrfProtection, csrfGet);

router.get("/me", authenticate, me);

export default router;
