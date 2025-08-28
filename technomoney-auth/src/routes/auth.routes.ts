import { Router, type RequestHandler } from "express";
import { loginLimiter } from "../middlewares/rateLimit.middleware";
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
router.post("/refresh", refresh);
router.post("/logout", logout);

const csrfPing: RequestHandler = (_req, res) => {
  res.sendStatus(204);
};
router.get("/csrf", csrfPing);

router.get("/me", authenticate, me);

export default router;
