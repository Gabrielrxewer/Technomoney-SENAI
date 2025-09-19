import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { buildRefreshCookie } from "../utils/cookie.util";
import type { AuthService } from "../services/auth.service";
import { logger } from "../utils/log/logger";
import {
  deriveSid,
  publishToSid,
  publishToUser,
  scheduleTokenExpiringSoon,
  clearSessionSchedules,
} from "../ws";
import { getTrustedDevice } from "../services/trusted-device.service";
import type { TotpService } from "../services/totp.service";

type AuthServiceContract = Pick<
  AuthService,
  "register" | "login" | "logout" | "refresh" | "createSession" | "issueStepUpToken"
>;
type TotpServiceContract = Pick<TotpService, "status">;
type TrustedDeviceFn = typeof getTrustedDevice;

const loadAuthService = (): AuthServiceContract => {
  const mod = require("../services/auth.service") as typeof import("../services/auth.service");
  return new mod.AuthService();
};

const loadTotpService = (): TotpServiceContract => {
  const mod = require("../services/totp.service") as typeof import("../services/totp.service");
  return new mod.TotpService();
};

const fallbackAuthService: AuthServiceContract = {
  async register() {
    throw new Error("authService not initialized");
  },
  async login() {
    throw new Error("authService not initialized");
  },
  async logout() {},
  async refresh() {
    throw new Error("authService not initialized");
  },
  async createSession() {
    throw new Error("authService not initialized");
  },
  async issueStepUpToken() {
    throw new Error("authService not initialized");
  },
};

const fallbackTotpService: TotpServiceContract = {
  async status() {
    throw new Error("totpService not initialized");
  },
};

const shouldSkipDefaults = process.env.AUTH_CONTROLLER_SKIP_DEFAULT === "1";

let authService: AuthServiceContract = shouldSkipDefaults
  ? fallbackAuthService
  : loadAuthService();
let totpService: TotpServiceContract = shouldSkipDefaults
  ? fallbackTotpService
  : loadTotpService();
let getTrustedDeviceImpl: TrustedDeviceFn = getTrustedDevice;

export const __setAuthControllerDeps = (deps: {
  authService?: AuthServiceContract;
  totpService?: TotpServiceContract;
  getTrustedDevice?: TrustedDeviceFn;
}): void => {
  if (deps.authService) authService = deps.authService;
  if (deps.totpService) totpService = deps.totpService;
  if (deps.getTrustedDevice) getTrustedDeviceImpl = deps.getTrustedDevice;
};

export const __resetAuthControllerDeps = (): void => {
  authService = shouldSkipDefaults ? fallbackAuthService : loadAuthService();
  totpService = shouldSkipDefaults ? fallbackTotpService : loadTotpService();
  getTrustedDeviceImpl = getTrustedDevice;
};
const cookieOpts = buildRefreshCookie();

const decodeExp = (token: string) => {
  try {
    const d: any = jwt.decode(token);
    return typeof d?.exp === "number" ? d.exp : 0;
  } catch {
    return 0;
  }
};

const decodeUserId = (token: string) => {
  try {
    const d: any = jwt.decode(token);
    return String(d?.sub || d?.id || "");
  } catch {
    return "";
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
      EMAIL_TAKEN: [400, "Falha ao tentar se registrar"],
      USERNAME_TAKEN: [400, "Falha ao tentar se registrar"],
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
    const { id: userId, username } = await authService.login(email, password);
    if (!userId) {
      res.status(401).json({ message: "Credenciais inválidas" });
      return;
    }
    const td = await getTrustedDeviceImpl(req);
    const isTrusted = !!td && td.userId === userId;
    if (!isTrusted) {
      const enrolled = await totpService.status(userId);
      const stepUp = await authService.issueStepUpToken(userId, username ?? null);
      const payload = { token: stepUp.token, username, acr: stepUp.acr };
      if (!enrolled) {
        res.status(401).json({ stepUp: "enroll_totp", ...payload });
        return;
      }
      res.status(401).json({ stepUp: "totp", ...payload });
      return;
    }
    const { access, refresh } = await authService.createSession(
      userId,
      username ?? null
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
