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
import {
  validateLogin,
  validateRegister,
} from "../middlewares/validate.middleware";

const router = Router();

router.post(
  "/login",
  validateLogin,
  loginByEmailLimiter,
  loginLimiter,
  recaptchaFor("login"),
  login
);

router.post(
  "/register",
  validateRegister,
  loginLimiter,
  recaptchaFor("register"),
  register
);

router.post("/refresh", refresh);
router.post("/logout", logout);

const csrfPing: RequestHandler = (_req, res) => {
  res.sendStatus(204);
};
router.get("/csrf", csrfPing);

router.get("/me", authenticate, me);

export default router;
