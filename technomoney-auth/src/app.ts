import "dotenv/config";
import express, { RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import totpRoutes from "./routes/totp.routes";
import wellKnownRoutes from "./routes/wellknown.routes";
import oidcRoutes from "./routes/oidc.routes";
import { swaggerSpec } from "./swagger";
import {
  secureHeaders,
  forceHttps,
} from "./middlewares/secureHeaders.middleware";
import { requestId } from "./middlewares/requestId.middleware";
import { corsOptions } from "./config/cors";
import { csrfProtection } from "./middlewares/csrf.middleware";
import {
  httpLogger,
  contextMiddleware,
} from "./middlewares/http-logger.middleware";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const swaggerEnabled =
  String(
    process.env.SWAGGER_ENABLED || (isProd ? "false" : "true")
  ).toLowerCase() === "true";
  
app.use(helmet());
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy({ policy: "same-site" }));
app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.set("trust proxy", 1);
app.use("/.well-known", wellKnownRoutes);
app.use(oidcRoutes);
app.use(requestId);
app.use(httpLogger);
app.use(contextMiddleware);
app.use(forceHttps);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use(secureHeaders);
app.use(
  helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: false })
);

if (swaggerEnabled) {
  const mw: RequestHandler =
    process.env.SWAGGER_BASIC_USER && process.env.SWAGGER_BASIC_PASS
      ? (req, res, next) => {
          const auth = String(req.headers.authorization || "");
          if (!auth.startsWith("Basic ")) {
            res.status(401).set("WWW-Authenticate", "Basic").end();
            return;
          }
          const raw = Buffer.from(auth.slice(6), "base64").toString();
          const [u, p] = raw.split(":");
          if (
            u === process.env.SWAGGER_BASIC_USER &&
            p === process.env.SWAGGER_BASIC_PASS
          ) {
            next();
            return;
          }
          res.status(401).set("WWW-Authenticate", "Basic").end();
        }
      : (_req, _res, next) => next();
  const swaggerServe = Array.isArray(swaggerUi.serve)
    ? (swaggerUi.serve as unknown as RequestHandler[])
    : [swaggerUi.serve as unknown as RequestHandler];
  const swaggerSetup = swaggerUi.setup(swaggerSpec, { explorer: false });
  app.use("/api-docs", mw, ...swaggerServe, swaggerSetup);
}

const healthz: RequestHandler = (_req, res) => {
  res.json({ ok: true });
};
app.get("/healthz", healthz);
app.use("/api/auth", authRoutes);
app.use("/api/totp", totpRoutes);

const csrfGet: RequestHandler = (req: any, res) => {
  const t = req.csrfToken();
  const secure =
    isProd &&
    String(process.env.COOKIE_SECURE || "true").toLowerCase() === "true";
  res.cookie("csrf", t, { httpOnly: false, sameSite: "strict", secure });
  res.json({ csrfToken: t });
};
app.get("/api/auth/csrf", csrfProtection, csrfGet);
app.use((err: any, req: any, res: any, _next: any) => {
  const isSyntax =
    err?.type === "entity.parse.failed" || err instanceof SyntaxError;
  const status = isSyntax ? 400 : Number(err?.status) || 500;
  const code = isSyntax
    ? "INVALID_JSON"
    : String(err?.code || "INTERNAL_ERROR");
  if (!res.getHeader("X-Request-Id") && req?.id)
    res.setHeader("X-Request-Id", String(req.id));
  res.status(status).json({ error: code });
});

export default app;
