import { Router } from "express";
import {
  login,
  register,
  getMe,
  refreshToken,
  logout,
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { getDashboardData } from "../controllers/dashboardController";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authenticate, getMe);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/dashboard", authenticate, getDashboardData);

export default router;
