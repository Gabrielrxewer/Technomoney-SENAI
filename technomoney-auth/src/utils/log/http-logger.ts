import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { runWithLogContext } from "./logging-context";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
  customProps: (req) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const ua = (req.headers["user-agent"] as string) || "";
    return { requestId: req.id, ip, ua };
  },
});

export const contextMiddleware = (req: any, _res: any, next: any) => {
  const ctx = {
    requestId: String(req.id || ""),
    ip: String(req.ip || ""),
    ua: String(req.headers["user-agent"] || ""),
  };
  runWithLogContext(ctx, next);
};
