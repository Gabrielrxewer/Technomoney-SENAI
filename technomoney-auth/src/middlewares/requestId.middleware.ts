import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";

export const requestId = (req: any, res: any, next: any) => {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  const id = incoming || uuid();
  res.setHeader("X-Request-ID", id);
  (req as any).requestId = id;
  logger.debug({ id, path: req.originalUrl, method: req.method }, "request.id");
  next();
};
