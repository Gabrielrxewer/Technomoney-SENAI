import { RequestHandler } from "express";
import { ReportService } from "../services/report.service";
import { logger } from "../utils/log/logger";
import { getLogContext } from "../utils/log/logging-context";

let reportService: ReportService = new ReportService();

export const __setReportsControllerDeps = (deps: { reportService?: ReportService }) => {
  if (deps.reportService) reportService = deps.reportService;
};

export const __resetReportsControllerDeps = () => {
  reportService = new ReportService();
};

export const monthlyAccessReport: RequestHandler = async (req, res) => {
  try {
    const month = typeof req.query?.month === "string" ? req.query.month : undefined;
    const report = await reportService.monthlyAccessReport(month);
    res.json(report);
  } catch (err: any) {
    const code = typeof err?.code === "string" ? err.code : "REPORT_ERROR";
    if (code === "INVALID_MONTH") {
      res.status(400).json({ error: "INVALID_MONTH", message: "Use o formato YYYY-MM." });
      return;
    }
    logger.error({ ...getLogContext(), err }, "reports.monthly_access.error");
    res.status(500).json({ error: "REPORT_GENERATION_FAILED" });
  }
};
