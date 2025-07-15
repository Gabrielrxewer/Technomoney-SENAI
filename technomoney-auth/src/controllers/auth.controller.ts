import { Request, Response } from "express";
import { buildRefreshCookie } from "../utils/cookie.util";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();
const cookieOpts = buildRefreshCookie();

/* ---------- REGISTER ---------- */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;
    const {
      access,
      refresh,
      username: uname,
    } = await authService.register(email, password, username);
    res
      .cookie("refreshToken", refresh, cookieOpts)
      .status(201)
      .json({ token: access, username: uname });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      EMAIL_TAKEN: [400, "E-mail já está em uso"],
      USERNAME_TAKEN: [400, "Nome de usuário já está em uso"],
    };
    const [code, msg] = map[e.message] || [500, "Erro interno"];
    res.status(code).json({ message: msg });
  }
};

/* ---------- LOGIN ---------- */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { access, refresh, username } = await authService.login(
      email,
      password
    );
    res
      .cookie("refreshToken", refresh, cookieOpts)
      .json({ token: access, username });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Conta não encontrada"],
      INVALID_PASSWORD: [400, "Senha inválida"],
    };
    const [code, msg] = map[e.message] || [500, "Erro interno"];
    res.status(code).json({ message: msg });
  }
};

/* ---------- REFRESH ---------- */
export const refresh = async (req: Request, res: any) => {
  const old = req.cookies.refreshToken;
  if (!old) return res.status(401).json({ message: "Refresh ausente" });

  try {
    const { access, newRefresh } = await authService.refresh(old);
    res.cookie("refreshToken", newRefresh, cookieOpts).json({ token: access });
  } catch {
    res.status(403).json({ message: "Refresh token revogado ou inválido" });
  }
};

/* ---------- LOGOUT ---------- */
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie("refreshToken", cookieOpts).json({ message: "Logout ok" });
};

/* ---------- ME ---------- */
export const me = (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ message: "Não autenticado" });
  const { id, username, exp } = req.user;
  res.json({ id, username, exp });
};
