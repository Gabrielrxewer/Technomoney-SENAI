import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import wellKnownRoutes from "./routes/wellknown.routes";
import { swaggerSpec } from "./swagger";
import {
  secureHeaders,
  forceHttps,
} from "./middlewares/secureHeaders.middleware";
import { requestId } from "./middlewares/requestId.middleware";
import type { Request } from "express";
import { logger } from "./utils/logger";

type CsrfRequest = Request & { csrfToken(): string };

const app = express();

const isProd = process.env.NODE_ENV === "production";
const swaggerEnabled =
  String(
    process.env.SWAGGER_ENABLED || (isProd ? "false" : "true")
  ).toLowerCase() === "true";

app.set("trust proxy", 1);

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
    cb(new Error("Origin not allowed"));
  },
  credentials: true,
};

app.use(requestId);
app.use(secureHeaders);
app.use(forceHttps);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const csrfSecure = csrf({
  cookie: { httpOnly: true, sameSite: "lax", secure: true },
});
const csrfInsecure = csrf({
  cookie: { httpOnly: true, sameSite: "lax", secure: false },
});

app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase();
  const shouldUseSecure =
    isProd && !host.startsWith("localhost") && !host.startsWith("127.0.0.1");
  const chosen = shouldUseSecure ? csrfSecure : csrfInsecure;
  return chosen(req, res, next);
});

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const token = (req as CsrfRequest).csrfToken();
    const host = (req.headers.host || "").toLowerCase();
    const shouldUseSecure =
      isProd && !host.startsWith("localhost") && !host.startsWith("127.0.0.1");
    res.cookie("XSRF-TOKEN", token, {
      sameSite: "lax",
      secure: shouldUseSecure,
      httpOnly: false,
      path: "/",
    });
  }
  next();
});

if (swaggerEnabled) {
  const basicUser = process.env.SWAGGER_BASIC_USER || "";
  const basicPass = process.env.SWAGGER_BASIC_PASS || "";
  const hasAuth = basicUser.length > 0 && basicPass.length > 0;
  const mw = hasAuth
    ? (req: Request, res: any, next: any) => {
        const hdr = String(req.headers.authorization || "");
        const expected =
          "Basic " +
          Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
        if (hdr === expected) return next();
        res.setHeader("WWW-Authenticate", "Basic");
        res.sendStatus(401);
      }
    : (_: any, __: any, next: any) => next();
  logger.debug({ enabled: true }, "swagger.enabled");
  app.use("/api-docs", mw, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} else {
  logger.debug({ enabled: false }, "swagger.enabled");
}

app.use("/.well-known", wellKnownRoutes);
app.use("/api/auth", authRoutes);

export default app;
