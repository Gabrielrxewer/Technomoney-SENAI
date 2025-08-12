import pino from "pino";

export const logger = pino({
  transport: { target: "pino-pretty" },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});
