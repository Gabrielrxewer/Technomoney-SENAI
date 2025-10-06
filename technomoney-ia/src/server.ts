import "./config/env";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ia.server.started");
});

process.on("SIGTERM", () => {
  logger.info("ia.server.shutdown");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("ia.server.interrupted");
  server.close(() => process.exit(0));
});
