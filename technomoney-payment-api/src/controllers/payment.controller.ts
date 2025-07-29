import { Request, Response } from "express";
import { createPreference, processWebhook } from "../services/payment.service";

export async function store(req: Request, res: Response) {
  try {
    const { amount, ...rest } = req.body;
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) {
      return res.status(400).json({ error: "amount must be a number" });
    }

    const pref = await createPreference({ ...rest, amount: numericAmount });
    return res.json(pref);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed to create preference" });
  }
}

export async function webhook(req: Request, res: Response) {
  const { topic, id } = req.query;
  await processWebhook(String(topic), String(id));
  res.sendStatus(200);
}
