import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import profileRoutes from "./routes/profileRoutes";
import { swaggerSpec } from "./swagger";
import { errorHandler } from "./middlewares/error.middleware";
import { secureHeaders, forceHttps } from "./middlewares/secureHeaders.middleware";

const defaultOrigins = [
  "https://www.technomoney.net.br",
  "https://technomoney.net.br",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4003",
  "http://localhost",
  "https://localhost",
];

function buildCorsOrigins(): string[] {
  const extra = process.env.CORS_ALLOWED_ORIGINS || "";
  const parsed = extra
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([...defaultOrigins, ...parsed]));
}

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  const allowedOrigins = buildCorsOrigins();

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
  app.use("/api", profileRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: "Rota não encontrada." });
  });
  app.use(errorHandler);

  return app;
}
