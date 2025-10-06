import type { Request, Response } from "express";
import { analysisRequestSchema } from "../types/analysis";
import { AiAgentService } from "../services/ai-agent.service";
import { logger } from "../utils/logger";

export class AnalysisController {
  constructor(private readonly service = new AiAgentService()) {}

  handle = (req: Request, res: Response) => {
    const parsed = analysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ err: parsed.error.flatten() }, "ia.analysis.invalid_payload");
      res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
      return;
    }

    const result = this.service.analyze(parsed.data);
    res.json(result);
  };
}
