import { Router, type RequestHandler } from "express";
import { loginLimiter } from "../middlewares/rateLimit.middleware";
import { csrfProtection } from "../middlewares/csrf.middleware";
import {
  login,
  register,
  me,
  refresh,
  logout,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/register", loginLimiter, register);

if (process.env.NODE_ENV === "production") {
  router.post("/refresh", csrfProtection, refresh);
  router.post("/logout", csrfProtection, logout);
  const csrfPing: RequestHandler = (_req, res) => {
    res.sendStatus(204);
  };
  router.get("/csrf", csrfPing);
} else {
  router.post("/refresh", refresh);
  router.post("/logout", logout);
  router.get("/csrf", (_req, res) => {
    res.sendStatus(204);
  });
}

router.get("/me", authenticate, me);

export default router;
