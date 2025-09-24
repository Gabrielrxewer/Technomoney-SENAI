import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import assetRoutes from "./routes/assetRoutes";
import { swaggerSpec } from "./swagger";
import { errorHandler } from "./middlewares/error.middleware";
import {
  secureHeaders,
  forceHttps,
} from "./middlewares/secureHeaders.middleware";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  const allowedOrigins = [
    "https://www.technomoney.net.br",
    "https://technomoney.net.br",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4002",
    "http://localhost",
    "https://localhost",
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Origin not allowed"));
    },
    credentials: true,
  };

  app.use(secureHeaders);
  app.use(forceHttps);
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api", assetRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: "Rota não encontrada." });
  });
  app.use(errorHandler);

  return app;
}
