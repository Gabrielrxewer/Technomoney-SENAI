import type { Request } from "express";
import { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { buildRefreshCookie } from "../utils/cookie.util";
import type { AuthService } from "../services/auth.service";
import { logger } from "../utils/log/logger";
import { getLogContext } from "../utils/log/logging-context";
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
  | "register"
  | "login"
  | "logout"
  | "refresh"
  | "createSession"
  | "issueStepUpToken"
  | "requestPasswordReset"
  | "resetPassword"
  | "requestEmailVerification"
  | "verifyEmail"
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
  async requestPasswordReset() {
    throw new Error("authService not initialized");
  },
  async resetPassword() {
    throw new Error("authService not initialized");
  },
  async requestEmailVerification() {
    throw new Error("authService not initialized");
  },
  async verifyEmail() {
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

const sanitizeAmr = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const values = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(values));
};

const buildTrustedDeviceSessionExtra = (
  td: Awaited<ReturnType<typeof getTrustedDevice>>,
  req: Request,
) => {
  const acr =
    td && typeof td.acr === "string" && td.acr.trim().length > 0
      ? td.acr
      : "aal2";
  const amr = sanitizeAmr(td?.amr);
  const extra: Record<string, unknown> = {
    acr,
    amr: amr.length ? amr : ["pwd", "otp"],
    trusted_device: true,
  };
  const tdid = (req as any)?.cookies?.tdid;
  if (typeof tdid === "string" && tdid.trim().length > 0) {
    extra.trusted_device_id = tdid.trim();
  }
  if (td && typeof td.issuedAt === "number" && Number.isFinite(td.issuedAt)) {
    extra.trusted_device_issued_at = td.issuedAt;
  }
  return extra;
};

const respondWithMessage = (
  res: Response,
  status: number,
  message: string,
  includeRequestId = false
) => {
  const body: Record<string, unknown> = { message };
  if (includeRequestId) {
    const { requestId } = getLogContext();
    if (requestId) {
      body.requestId = requestId;
    }
  }
  res.status(status).json(body);
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
    const key = typeof e?.code === "string" ? e.code : e?.message;
    const match = key ? map[key] : undefined;
    const status =
      (typeof e?.status === "number" && e.status) || match?.[0] || 500;
    const message = match?.[1] || "Erro interno";
    respondWithMessage(res, status, message, key === "ISSUE_TOKENS_FAILED");
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
    const extra = buildTrustedDeviceSessionExtra(td, req);
    const { access, refresh } = await authService.createSession(
      userId,
      username ?? null,
      extra,
    );
    const sid = deriveSid(refresh);
    const exp = decodeExp(access);
    scheduleTokenExpiringSoon(sid, exp);
    res
      .cookie("refreshToken", refresh, cookieOpts)
      .json({ token: access, username });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      INVALID_CREDENTIALS: [401, "Credenciais inválidas"],
      EMAIL_NOT_VERIFIED: [403, "Confirme seu e-mail para continuar"],
      JWT_CONFIG_INVALID: [500, "Configuração de JWT ausente"],
      ISSUE_TOKENS_FAILED: [500, "Falha ao emitir tokens"],
    };
    const key = typeof e?.code === "string" ? e.code : e?.message;
    const match = key ? map[key] : undefined;
    const status =
      (typeof e?.status === "number" && e.status) || match?.[0] || 500;
    const message = match?.[1] || "Erro interno";
    respondWithMessage(res, status, message, key === "ISSUE_TOKENS_FAILED");
  }
};

export const refresh: RequestHandler = async (req, res) => {
  const old = (req as any).cookies?.refreshToken as string | undefined;
  if (!old) {
    res.status(401).json({ message: "Refresh ausente" });
    return;
  }
  try {
    let td: Awaited<ReturnType<typeof getTrustedDeviceImpl>> | null = null;
    try {
      td = await getTrustedDeviceImpl(req);
    } catch {}
    const provider = td
      ? async (userId: string) => {
          if (!td || td.userId !== userId) return {};
          return buildTrustedDeviceSessionExtra(td, req);
        }
      : undefined;
    const { access, refresh } = await authService.refresh(old, provider);
    const oldSid = deriveSid(old);
    const newSid = deriveSid(refresh);
    const exp = decodeExp(access);
    scheduleTokenExpiringSoon(newSid, exp);
    publishToSid(oldSid, { type: "session.refreshed", exp });
    res.cookie("refreshToken", refresh, cookieOpts).json({ token: access });
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      REFRESH_REUSE_DETECTED: [403, "Sessão comprometida"],
      INVALID_REFRESH: [401, "Refresh token revogado ou inválido"],
    };
    const key = typeof e?.code === "string" ? e.code : e?.message;
    if (key === "REFRESH_REUSE_DETECTED") {
      try {
        const u = (req as any).user as { id: string } | undefined;
        if (u?.id) publishToUser(u.id, { type: "session.compromised" });
      } catch {}
    }
    const match = key ? map[key] : undefined;
    const status =
      (typeof e?.status === "number" && e.status) || match?.[0] || 500;
    const message = match?.[1] || "Erro interno";
    res.status(status).json({ message });
  }
};

export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email } = req.body as { email?: string };
  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ message: "Requisição inválida" });
    return;
  }
  try {
    await authService.requestPasswordReset(email.trim());
    res
      .status(202)
      .json({ message: "Se o e-mail existir, enviaremos instruções." });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    res.status(status).json({ message: "Erro interno" });
  }
};

export const confirmPasswordReset: RequestHandler = async (req, res) => {
  const { token, password } = req.body as {
    token?: string;
    password?: string;
  };
  if (
    typeof token !== "string" ||
    token.trim().length === 0 ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    res.status(400).json({ message: "Requisição inválida" });
    return;
  }
  try {
    await authService.resetPassword(token.trim(), password);
    res.status(204).send();
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      INVALID_TOKEN: [400, "Token inválido"],
      TOKEN_ALREADY_USED: [400, "Token inválido"],
      TOKEN_EXPIRED: [400, "Token expirado"],
    };
    const key = typeof e?.code === "string" ? e.code : e?.message;
    const match = key ? map[key] : undefined;
    const status =
      (typeof e?.status === "number" && e.status) || match?.[0] || 500;
    const message = match?.[1] || "Erro interno";
    res.status(status).json({ message });
  }
};

export const requestEmailVerification: RequestHandler = async (req, res) => {
  const { email } = req.body as { email?: string };
  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ message: "Requisição inválida" });
    return;
  }
  try {
    await authService.requestEmailVerification(email.trim());
    res
      .status(202)
      .json({ message: "Se o e-mail existir, enviaremos instruções." });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    res.status(status).json({ message: "Erro interno" });
  }
};

export const confirmEmailVerification: RequestHandler = async (req, res) => {
  const { token } = req.body as { token?: string };
  if (typeof token !== "string" || token.trim().length === 0) {
    res.status(400).json({ message: "Requisição inválida" });
    return;
  }
  try {
    await authService.verifyEmail(token.trim());
    res.status(204).send();
  } catch (e: any) {
    const map: Record<string, [number, string]> = {
      INVALID_TOKEN: [400, "Token inválido"],
      TOKEN_ALREADY_USED: [400, "Token inválido"],
      TOKEN_EXPIRED: [400, "Token expirado"],
    };
    const key = typeof e?.code === "string" ? e.code : e?.message;
    const match = key ? map[key] : undefined;
    const status =
      (typeof e?.status === "number" && e.status) || match?.[0] || 500;
    const message = match?.[1] || "Erro interno";
    res.status(status).json({ message });
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
