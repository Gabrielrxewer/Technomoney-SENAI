import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import { swaggerSpec } from "./swagger";
import {
  secureHeaders,
  forceHttps,
} from "./middlewares/secureHeaders.middleware";

type CsrfRequest = Request & { csrfToken(): string };

const app = express();
const isProd = process.env.NODE_ENV === "production";

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
    "X-XSRF-TOKEN",
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

if (isProd) {
  app.set("trust proxy", 1);
  app.use(forceHttps);
}

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(secureHeaders);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

if (isProd) {
  const csrfProtection = csrf({
    cookie: { httpOnly: true, sameSite: "lax", secure: true },
  });
  app.use(csrfProtection);
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const token = (req as unknown as CsrfRequest).csrfToken();
      res.cookie("XSRF-TOKEN", token, { sameSite: "lax", secure: true });
    }
    next();
  });
}

app.use("/api/auth", authRoutes);

export default app;
