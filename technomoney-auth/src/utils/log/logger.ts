import pino, { LoggerOptions } from "pino";
import { stdSerializers } from "pino";
import { isatty } from "tty";

const redact = [
  "req.headers.*",
  "res.headers.*",
  "headers.*",
  "cookies",
  "password",
  "password_hash",
  "token",
  "access",
  "refresh",
  "oldToken",
  "newToken",
  "secret",
  "client_secret",
  "private_key",
  "rsa_private",
  "key",
];

const pretty = isatty(1);
const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  redact: { paths: redact, remove: false },
  serializers: { err: stdSerializers.err },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger = pino(
  options,
  pretty
    ? pino.transport({
        targets: [
          {
            target: "pino-pretty",
            options: {
              translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
              singleLine: false,
            },
          },
        ],
      })
    : undefined
);

export const getLogger = (bindings: Record<string, unknown>) =>
  logger.child(bindings);
