import { Request, Response, CookieOptions, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import {
  registerUser,
  loginUser,
  findUserByUsername,
} from "../services/authService";
import {
  addRefreshToken,
  removeRefreshToken,
  isRefreshTokenValid,
} from "../services/tokenService";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/* ---------- REGISTER ---------- */
export const register: RequestHandler = async (req: any, res: any) => {
  const { email, password, username } = req.body;

  try {
    const existingEmail = await loginUser(email);
    if (existingEmail)
      return res.status(400).json({ message: "E-mail já está em uso" });

    const existingUsername = await findUserByUsername(username);
    if (existingUsername)
      return res
        .status(400)
        .json({ message: "Nome de usuário já está em uso" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await registerUser(email, hashedPassword, username);

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);
    await addRefreshToken(refreshToken, newUser.id);

    return res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .status(201)
      .json({ token: accessToken, username: newUser.username });
  } catch (error: any) {
    if (error.code === "P2002") {
      const message = error.meta?.target?.includes("username")
        ? "Nome de usuário já está em uso"
        : "E-mail já está em uso";
      return res.status(400).json({ message });
    }
    console.error("Register error:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

/* ---------- LOGIN ---------- */
export const login: RequestHandler = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await loginUser(email);
    if (!user) return res.status(404).json({ message: "Conta não encontrada" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Senha inválida" });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await addRefreshToken(refreshToken, user.id);

    return res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .status(200)
      .json({ token: accessToken, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

/* ---------- REFRESH TOKEN ---------- */
export const refreshToken: RequestHandler = async (req: any, res: any) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Refresh token ausente" });

  const valid = await isRefreshTokenValid(token);
  if (!valid)
    return res
      .status(403)
      .json({ message: "Refresh token revogado ou inválido" });

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string };

    const accessToken = generateAccessToken(payload.id);
    return res.json({ token: accessToken });
  } catch (err) {
    console.error("Refresh token inválido:", err);
    return res.status(403).json({ message: "Refresh token inválido" });
  }
};

/* ---------- GET ME ---------- */
export const getMe: RequestHandler = (req: any, res: any) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Não autenticado" });

  return res.json({
    id: user.id,
    username: user.username,
    exp: user.exp,
  });
};

/* ---------- LOGOUT ---------- */
export const logout: RequestHandler = async (req: any, res: any) => {
  const token = req.cookies.refreshToken;
  if (token) await removeRefreshToken(token);

  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  return res.status(200).json({ message: "Logout realizado com sucesso" });
};
