import { RequestHandler } from "express";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();
const basePassword = z.string().min(12).max(1024);

const strongPassword = (password: string, email?: string) => {
  const p = String(password);
  const local = String(email || "").split("@")[0] || "";
  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /\d/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);
  const classes =
    [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length >= 3;
  const noSpaces = !/\s/.test(p);
  const notEmailLocal =
    local.length < 4 || !p.toLowerCase().includes(local.toLowerCase());
  const notTrivial = !/(?:1234|abcd|qwerty|password|senha)/i.test(p);
  return classes && noSpaces && notEmailLocal && notTrivial;
};

const loginSchema = z
  .object({
    email: emailSchema,
    password: basePassword,
  })
  .superRefine(({ email, password }, ctx) => {
    if (!strongPassword(password, email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "weak",
      });
    }
  });

const registerSchema = z
  .object({
    email: emailSchema,
    password: basePassword,
  })
  .superRefine(({ email, password }, ctx) => {
    if (!strongPassword(password, email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "weak",
      });
    }
  });

const validate =
  (schema: z.ZodSchema): RequestHandler =>
  (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Dados inválidos" });
      return;
    }
    req.body = parsed.data;
    next();
  };

export const validateLogin: RequestHandler = validate(loginSchema);
export const validateRegister: RequestHandler = validate(registerSchema);

export const validateTotpBody: RequestHandler = (req, res, next) => {
  const schema = z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Código inválido" });
    return;
  }
  req.body = parsed.data;
  next();
};
