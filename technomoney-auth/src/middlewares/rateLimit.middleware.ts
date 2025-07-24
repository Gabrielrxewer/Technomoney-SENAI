import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    const resetTime = (req as any).rateLimit.resetTime as Date;
    const now = new Date();
    const secs = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

    res.status(429).json({
      message: `Muitas tentativas. Tente novamente em ${secs} segundos.`,
      retryAfter: secs,
    });
  },
});
