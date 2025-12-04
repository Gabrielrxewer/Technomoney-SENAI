import { Router } from "express";
import { AnalysisController } from "../controllers/analysis.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireDPoP } from "../middlewares/dpop.middleware";

const router = Router();
const controller = new AnalysisController();

router.post("/analysis", authenticate, requireDPoP, controller.handle);

export default router;
