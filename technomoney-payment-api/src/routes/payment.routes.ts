import { Router } from "express";
import * as payments from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/payments", requireAuth, payments.store);
router.post("/webhooks/mercadopago", payments.webhook);

export default router;
