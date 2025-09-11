import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { ensureRedis } from "./startup/ensureRedis";
import { logger } from "./utils/log/logger";
import { attachWs } from "./ws";

dotenv.config();

const PORT = process.env.PORT || 4000;
ensureRedis();
const server = http.createServer(app);
attachWs(server);
server.listen(PORT, () => {
  logger.info(`Auth server on port ${PORT}`);
  logger.info(`Swagger on http://localhost:${PORT}/api-docs`);
});
