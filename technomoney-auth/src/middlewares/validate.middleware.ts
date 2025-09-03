import { RequestHandler } from "express";

const emailOk = (e: unknown) =>
  typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const str = (s: unknown) => typeof s === "string" && s.length > 0;

export const validateLogin: RequestHandler = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!emailOk(email) || !str(password)) {
    res.status(400).json({ message: "Dados inválidos" });
    return;
  }
  next();
};

export const validateRegister: RequestHandler = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!emailOk(email) || !str(password)) {
    res.status(400).json({ message: "Dados inválidos" });
    return;
  }
  next();
};
