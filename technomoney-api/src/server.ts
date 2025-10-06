import "./config/env";
import { createApp } from "./app";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT) || 4002;
const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Swagger UI   on http://localhost:${PORT}/api-docs`);
});

function toErrorString(input: unknown): string {
  if (input instanceof Error) return input.stack ?? input.message;
  try {
    return typeof input === "string" ? input : JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function shutdown(signal: NodeJS.Signals) {
  logger.info(`\n${signal} recebido — encerrando HTTP…`);
  server.close(() => {
    logger.info("HTTP encerrado com sucesso. Até logo!");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${toErrorString(reason)}`);
});
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${toErrorString(err)}`);
  process.exit(1);
});
