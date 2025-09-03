import pino from "pino";

export const logger = pino({
  transport: { target: "pino-pretty" },
  level: process.env.LOG_LEVEL || process.env.PINO_LEVEL || "debug",
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.captchaToken",
      "req.body.captcha",
      "RECAPTCHA_SECRET",
    ],
    remove: false,
  },
});
