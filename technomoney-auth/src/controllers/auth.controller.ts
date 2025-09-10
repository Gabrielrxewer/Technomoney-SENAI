import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { buildRefreshCookie } from "../utils/cookie.util";
import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";
import {
  deriveSid,
  publishToSid,
  publishToUser,
  scheduleTokenExpiringSoon,
  clearSessionSchedules,
} from "../ws";

const authService = new AuthService();
const cookieOpts = buildRefreshCookie();

const decodeExp = (token: string) => {
  try {
    const d: any = jwt.decode(token);
    return typeof d?.exp === "number" ? d.exp : 0;
  } catch {
    return 0;
  }
};

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
    const sid = deriveSid(refresh);
    const exp = decodeExp(access);
    scheduleTokenExpiringSoon(sid, exp);
    res
      .cookie("refreshToken", refresh, cookieOpts)
      .json({ token: access, username: uname });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      EMAIL_TAKEN: [400, "E-mail em uso"],
      USERNAME_TAKEN: [400, "Username em uso"],
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
    const sid = deriveSid(refresh);
    const exp = decodeExp(access);
    scheduleTokenExpiringSoon(sid, exp);
    res
      .cookie("refreshToken", refresh, cookieOpts)
      .json({ token: access, username });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [401, "Credenciais inválidas"],
      INVALID_PASSWORD: [401, "Credenciais inválidas"],
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
    const { access, refresh } = await authService.refresh(old);
    const oldSid = deriveSid(old);
    const newSid = deriveSid(refresh);
    const exp = decodeExp(access);
    scheduleTokenExpiringSoon(newSid, exp);
    publishToSid(oldSid, { type: "session.refreshed", exp });
    res.cookie("refreshToken", refresh, cookieOpts).json({ token: access });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      REFRESH_REUSE_DETECTED: [401, "Sessão comprometida"],
      INVALID_REFRESH: [403, "Refresh token revogado ou inválido"],
    };
    if (e && e.message === "REFRESH_REUSE_DETECTED") {
      try {
        const u = (req as any).user as { id: string } | undefined;
        if (u?.id) publishToUser(u.id, { type: "session.compromised" });
      } catch {}
    }
    const [code, msg] = map[e.message] || [500, "Erro interno"];
    res.status(code).json({ message: msg });
  }
};

export const logout: RequestHandler = async (req, res) => {
  const token = (req as any).cookies?.refreshToken as string | undefined;
  if (token) await authService.logout(token);
  const sid = token ? deriveSid(token) : "";
  if (sid) {
    publishToSid(sid, { type: "session.revoked", reason: "user_logout" });
    clearSessionSchedules(sid);
  }
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
