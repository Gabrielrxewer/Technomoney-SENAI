import { Router } from "express";
import { AnalysisController } from "../controllers/analysis.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const controller = new AnalysisController();

router.post("/analysis", authenticate, controller.handle);

export default router;
