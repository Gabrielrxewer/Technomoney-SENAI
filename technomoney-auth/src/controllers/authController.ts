import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import bcrypt from "bcryptjs";
import { registerUser, loginUser } from "../services/authService";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: any, res: any): Promise<any> => {
  const { email, password, username } = req.body;

  try {
    const existingUser = await loginUser(email);
    if (existingUser) {
      return res.status(400).json({ message: "E-mail já está em uso" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await registerUser(email, hashedPassword, username);

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .status(201)
      .json({ token: accessToken, username });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

export const login = async (req: any, res: any): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await loginUser(email);
    if (!user) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Senha inválida" });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const username = user.username;

    res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .status(200)
      .json({ token: accessToken, username });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

export const refreshToken = (req: any, res: any) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token ausente" });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string };
    const accessToken = generateAccessToken(payload.id);

    res.json({ token: accessToken });
  } catch (err) {
    return res.status(403).json({ message: "Refresh token inválido" });
  }
};

export const getMe = (req: any, res: any) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  return res.json({
    id: user.id,
    username: user.username,
    exp: user.exp,
  });
};
