import { Router } from "express";
import * as payments from "../controllers/payment.controller";

const router = Router();

router.post("/payments", payments.store);
router.post("/webhooks/mercadopago", payments.webhook);

export default router;
