import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import assetRoutes from "./routes/assetRoutes";
import { swaggerSpec } from "./swagger";
import { authenticate } from "./middlewares/authenticate.middleware";
import { errorHandler } from "./middlewares/error.middleware";

export function createApp(): Application {
  const app = express();

  const allowedOrigins = [
    "https://www.technomoney.net.br",
    "https://technomoney.net.br",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "https://localhost",
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };

  app.use(cors(corsOptions));
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
