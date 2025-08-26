import { RequestHandler } from "express";
import { buildRefreshCookie } from "../utils/cookie.util";
import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";

const authService = new AuthService();
const cookieOpts = buildRefreshCookie();

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, username } = req.body as {
      email: string;
      password: string;
      username?: string;
    };
    const {
      access,
      refresh,
      username: uname,
    } = await authService.register(email, password, username);
    res.cookie("refreshToken", refresh, cookieOpts).status(201).json({
      token: access,
      username: uname,
    });
  } catch (e: any) {
    logger.error({ err: e }, "REGISTER_ERROR");
    const map: Record<string, [number, string]> = {
      EMAIL_TAKEN: [400, "E-mail já está em uso"],
      USERNAME_TAKEN: [400, "Nome de usuário já está em uso"],
      JWT_CONFIG_INVALID: [500, "Configuração de JWT ausente"],
      ISSUE_TOKENS_FAILED: [500, "Falha ao emitir tokens"],
    };
    const [code, msg] = map[e.message] || [500, "Erro interno"];
    res.status(code).json({ message: msg });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const { access, refresh, username } = await authService.login(
      email,
      password
    );
    res.cookie("refreshToken", refresh, cookieOpts).json({
      token: access,
      username,
    });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Conta não encontrada"],
      INVALID_PASSWORD: [400, "Senha inválida"],
      JWT_CONFIG_INVALID: [500, "Configuração de JWT ausente"],
      ISSUE_TOKENS_FAILED: [500, "Falha ao emitir tokens"],
    };
    const [code, msg] = map[e.message] || [500, "Erro interno"];
    res.status(code).json({ message: msg });
  }
};

export const refresh: RequestHandler = async (req, res) => {
  const old = (req as any).cookies?.refreshToken as string | undefined;
  if (!old) {
    res.status(401).json({ message: "Refresh ausente" });
    return;
  }
  try {
    const { access, newRefresh } = await authService.refresh(old);
    res.cookie("refreshToken", newRefresh, cookieOpts).json({ token: access });
  } catch {
    res.status(403).json({ message: "Refresh token revogado ou inválido" });
  }
};

export const logout: RequestHandler = async (req, res) => {
  const token = (req as any).cookies?.refreshToken as string | undefined;
  if (token) await authService.logout(token);
  res.clearCookie("refreshToken", cookieOpts).json({ message: "Logout ok" });
};

export const me: RequestHandler = (req, res) => {
  const u = (req as any).user as
    | { id: string; username: string; exp: number }
    | undefined;
  if (!u) {
    res.status(401).json({ message: "Não autenticado" });
    return;
  }
  const { id, username, exp } = u;
  res.json({ id, username, exp });
};
