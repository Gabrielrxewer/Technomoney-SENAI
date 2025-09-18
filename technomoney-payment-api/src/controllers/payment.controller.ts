import { Request, Response } from "express";
import {
  createPreference,
  processWebhook,
  validateCreatePreferencePayload,
  verifyWebhookSecurity,
  ValidationError,
  UnauthorizedError,
} from "../services/payment.service";

export async function store(req: Request, res: Response) {
  try {
    const payload = validateCreatePreferencePayload(req.body);
    const pref = await createPreference(payload);
    return res.json(pref);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "failed to create preference" });
  }
}

export async function webhook(req: Request, res: Response) {
  try {
    const { topic, id } = req.query;
    if (typeof topic !== "string" || typeof id !== "string") {
      return res.status(400).json({ error: "invalid webhook payload" });
    }

    verifyWebhookSecurity({
      topic,
      resourceId: id,
      headers: req.headers,
    });

    await processWebhook(topic, id);
    res.sendStatus(200);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "failed to process webhook" });
  }
}
