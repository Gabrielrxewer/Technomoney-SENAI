import { Router } from "express";
import analysisRoutes from "./analysis.routes";

const router = Router();

router.use("/v1", analysisRoutes);

export default router;
