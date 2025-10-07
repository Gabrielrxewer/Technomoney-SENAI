import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import pinoHttp from "pino-http";
import type { Level } from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});

export const resolveHttpLogLevel = (
  _req: IncomingMessage,
  res: ServerResponse,
  err?: Error
): Level => {
  if (err || res.statusCode >= 500) return "error";
  if (res.statusCode >= 400) return "warn";
  return "info";
};

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: resolveHttpLogLevel,
});
