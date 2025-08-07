import "./config/env";
import { createApp } from "./app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT ?? 4002;
const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Swagger UI   on http://localhost:${PORT}/api-docs`);
});

function shutdown(signal: NodeJS.Signals) {
  logger.info(`\n${signal} recebido — encerrando HTTP…`);
  server.close((err) => {
    if (err) {
      logger.error("Erro ao encerrar o servidor", err);
      process.exit(1);
    }
    logger.info("HTTP encerrado com sucesso. Até logo!");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});
