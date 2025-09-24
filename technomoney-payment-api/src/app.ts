import express, { NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes";

dotenv.config();

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

const forceHttps = (req: Request, res: Response, next: NextFunction) => {
  const hostHeader = req.headers.host;
  if (!hostHeader) {
    return next();
  }
  const host = hostHeader.toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return next();
  }
  if (req.secure) {
    return next();
  }
  return res.redirect(301, `https://${hostHeader}${req.originalUrl}`);
};

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'none'"],
};

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: cspDirectives,
  })
);
app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: true }));
app.use(forceHttps);
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", paymentRoutes);

export default app;
