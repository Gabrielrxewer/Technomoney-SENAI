import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "../utils/log/logger";
import { runWithLogContext } from "../utils/log/logging-context";

const successLevel = (process.env.HTTP_SUCCESS_LOG_LEVEL || "info") as
  | "trace"
  | "debug"
  | "info";

export const httpLogger = pinoHttp({
  logger,
  customAttributeKeys: { req: "req", res: "res", responseTime: "ms" },
  serializers: {
    req: (req: any) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res: any) => ({ statusCode: res.statusCode }),
  },
  genReqId: (req: any) =>
    req.id || (req.headers["x-request-id"] as string) || randomUUID(),
  customProps: (req) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const ua = (req.headers["user-agent"] as string) || "";
    return { requestId: (req as any).id, ip, ua };
  },
  customLogLevel: (req, res, err) => {
    if (err) return "error";
    const code = res.statusCode || 0;
    if (code >= 500) return "error";
    if (code >= 400) return "warn";
    return successLevel;
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  autoLogging: {
    ignore: (req) =>
      req.url === "/healthz" ||
      req.url.startsWith("/api-docs") ||
      req.url.startsWith("/.well-known"),
  },
});

export const contextMiddleware = (req: any, res: any, next: any) => {
  if (!res.getHeader("X-Request-Id") && req.id) {
    res.setHeader("X-Request-Id", String(req.id));
  }
  const ctx = {
    requestId: String(req.id || req.headers["x-request-id"] || ""),
    ip:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "",
    ua: String(req.headers["user-agent"] || ""),
  };
  runWithLogContext(ctx, next);
};
