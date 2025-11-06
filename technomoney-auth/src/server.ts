import dotenv from "dotenv";
import http from "http";
import { ensureTotpEncKey } from "./services/totp.service";
import { ensureRedis } from "./startup/ensureRedis";
import { ensureJwtKeys } from "./startup/ensureJwtKeys";
import { logger } from "./utils/log/logger";
import { safeErr } from "./utils/log/log.helpers";
import { attachWs } from "./ws";

dotenv.config();

const bootstrap = async () => {
  try {
    await ensureJwtKeys();
    ensureTotpEncKey();
    ensureRedis();
    const { default: app } = await import("./app");
    const PORT = process.env.PORT || 4000;
    const server = http.createServer(app);
    attachWs(server);
    server.listen(PORT, () => {
      logger.info(`Auth server on port ${PORT}`);
      logger.info(`Swagger on http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error({ evt: "startup.failed", err: safeErr(error) });
    process.exit(1);
  }
};

bootstrap();
