// src/app.ts
import express, { type RequestHandler, type Request } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import { corsOrigins } from "./config/cors.whitelist";
import { swaggerSpec } from "./swagger";
import {
  secureHeaders,
  forceHttps,
} from "./middlewares/secureHeaders.middleware";

type CsrfRequest = Request & { csrfToken(): string };

const app = express();
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.enable("trust proxy");
  app.use(forceHttps);
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(secureHeaders);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

if (isProd) {
  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    },
  });

  app.use(csrfProtection);

  const exposeCsrfCookie: RequestHandler = (req, res, next) => {
    const token = (req as CsrfRequest).csrfToken();
    res.cookie("XSRF-TOKEN", token, {
      sameSite: "strict",
      secure: true,
    });
    next();
  };

  app.use(exposeCsrfCookie);
}

app.use("/api/auth", authRoutes);

export default app;
