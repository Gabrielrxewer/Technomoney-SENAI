import { Router } from "express";
import * as payments from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireDPoP } from "../middlewares/dpop.middleware";

const router = Router();

router.post("/payments", requireAuth, requireDPoP, payments.store);
router.post("/webhooks/mercadopago", payments.webhook);

export default router;
