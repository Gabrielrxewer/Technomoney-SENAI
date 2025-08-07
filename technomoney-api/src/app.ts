import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import assetRoutes from "./routes/assetRoutes";
import { swaggerSpec } from "./swagger";
import { authenticate } from "./middlewares/authenticate.middleware";
import { errorHandler } from "./middlewares/error.middleware";

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:3000", "http://localhost:4002"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api", authenticate, assetRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: "Rota não encontrada." });
  });
  app.use(errorHandler);

  return app;
}
