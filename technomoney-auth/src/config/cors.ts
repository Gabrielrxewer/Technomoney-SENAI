import { CorsOptions } from "cors";

const parseOrigins = () => {
  const raw = String(process.env.ALLOWED_ORIGINS || "").trim();
  if (!raw) {
    const fe = process.env.FE_URL || "http://localhost:3000";
    return [fe];
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
};

export const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    const allowlist = parseOrigins();
    if (!origin) return cb(null, true);
    if (allowlist.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-csrf-token","X-Request-Id"],
  exposedHeaders: ["X-Request-Id"]
};
