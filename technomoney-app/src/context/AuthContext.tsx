import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { authApi, setAuthTokenGetter } from "../services/http";
import type {
  AuthContextType,
  AuthEvent,
  AuthResponse,
  MeResponse,
} from "../types/auth";

function b64urlToBuffer(b64url: string): ArrayBuffer {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

function bufferToB64url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.byteLength; i++) s += String.fromCharCode(b[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const tokenRef = useRef<string | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(null);
  const setToken = useCallback((value: string | null) => {
    tokenRef.current = value;
    setTokenState(value);
  }, []);
  const token = tokenState;
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<AuthEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(500);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const r = await authApi.post<AuthResponse>(
        "/auth/refresh",
        {},
        { withCredentials: true }
      );
      const newToken = r.data.token;
      setToken(newToken);
      setIsAuthenticated(true);
      return newToken;
    } catch {
      setToken(null);
      setIsAuthenticated(false);
      return null;
    }
  }, [setToken]);

  const getMe = useCallback(
    async (currentToken: string): Promise<MeResponse | null> => {
      try {
        const r = await authApi.get<MeResponse>("/auth/me", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        setUsername(r.data.username || null);
        setIsAuthenticated(true);
        return r.data;
      } catch {
        setIsAuthenticated(false);
        return null;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.post("/auth/logout", {}, { withCredentials: true });
    } catch {}
    try {
      wsRef.current?.close();
    } catch {}
    setConnected(false);
    setToken(null);
    setUsername(null);
    setIsAuthenticated(false);
  }, [setToken]);

  const connectEvents = useCallback(
    async (currentToken?: string) => {
      try {
        let bearer = currentToken || tokenRef.current;
        if (!bearer) bearer = await refreshToken();
        if (!bearer) return;
        const r = await authApi.post<{
          ticket: string;
          sid: string;
          wsUrl: string;
        }>(
          "/auth/ws-ticket",
          {},
          {
            headers: { Authorization: `Bearer ${bearer}` },
            withCredentials: true,
          }
        );
        const ws = new WebSocket(
          r.data.wsUrl,
          `tm.auth.ticket.${r.data.ticket}`
        );
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          backoffRef.current = 500;
        };
        ws.onclose = async (e) => {
          setConnected(false);
          if ([4001, 4002, 4003, 4004].includes(e.code)) return;
          await new Promise((s) =>
            setTimeout(s, backoffRef.current + Math.random() * 200)
          );
          backoffRef.current = Math.min(backoffRef.current * 2, 10000);
          connectEvents();
        };
        ws.onmessage = async (ev) => {
          try {
            const msg = JSON.parse(ev.data) as AuthEvent;
            setLastEvent(msg);
            if (msg.type === "token.expiring_soon") {
              await refreshToken();
            } else if (msg.type === "session.refreshed") {
            } else if (
              msg.type === "session.revoked" ||
              msg.type === "session.compromised"
            ) {
              await logout();
              window.location.assign("/login");
            } else if (msg.type === "jwks.rotated") {
              const url = `${import.meta.env.VITE_AUTH_API_URL || ""}/.well-known/jwks.json`;
              try {
                await fetch(url, { cache: "reload" });
              } catch {}
            } else if (msg.type === "hello") {
            } else if (msg.type === "stepup.required") {
            }
          } catch {}
        };
      } catch (e: any) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          const nt = await refreshToken();
          if (nt && nt !== currentToken) {
            await connectEvents(nt);
            return;
          }
          await logout();
        }
      }
    },
    [refreshToken, logout]
  );

  const loginFn = useCallback(
    async (newToken: string, name: string | null) => {
      setToken(newToken);
      if (name) setUsername(name);
      setIsAuthenticated(true);
      await connectEvents(newToken);
    },
    [connectEvents, setToken]
  );

  const fetchWithAuth = useCallback(
    async (
      input: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse> => {
      const bearer = tokenRef.current || (await refreshToken());
      if (!bearer) throw new Error("unauthenticated");
      try {
        const r = await authApi.request({
          url: input,
          headers: { Authorization: `Bearer ${bearer}` },
          ...config,
        });
        return r;
      } catch (e: any) {
        if (e?.response?.status === 401) {
          const nt = await refreshToken();
          if (!nt) throw e;
          const r = await authApi.request({
            url: input,
            headers: { Authorization: `Bearer ${nt}` },
            ...config,
          });
          return r;
        }
        throw e;
      }
    },
    [refreshToken]
  );

  const webauthnRegister = useCallback(async (): Promise<boolean> => {
    const t = tokenRef.current || (await refreshToken());
    if (!t) return false;
    const start = await authApi.post<any>(
      "/webauthn/register/start",
      {},
      { headers: { Authorization: `Bearer ${t}` } }
    );
    const pub: any = start.data;
    pub.challenge = b64urlToBuffer(pub.challenge);
    pub.user.id = b64urlToBuffer(pub.user.id);
    if (Array.isArray(pub.excludeCredentials)) {
      pub.excludeCredentials = pub.excludeCredentials.map((c: any) => ({
        ...c,
        id: b64urlToBuffer(c.id),
      }));
    }
    const cred = (await navigator.credentials.create({
      publicKey: pub,
    })) as PublicKeyCredential;
    const att = cred.response as AuthenticatorAttestationResponse;
    const finish = {
      id: cred.id,
      rawId: bufferToB64url(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: bufferToB64url(att.clientDataJSON),
        attestationObject: bufferToB64url(att.attestationObject),
      },
    };
    await authApi.post("/webauthn/register/finish", finish, {
      headers: { Authorization: `Bearer ${t}` },
    });
    return true;
  }, [refreshToken]);

  const webauthnAuthenticate = useCallback(async (): Promise<boolean> => {
    const t = tokenRef.current || (await refreshToken());
    if (!t) return false;
    const start = await authApi.post<any>(
      "/webauthn/authenticate/start",
      {},
      { headers: { Authorization: `Bearer ${t}` } }
    );
    const req: any = start.data;
    req.challenge = b64urlToBuffer(req.challenge);
    if (Array.isArray(req.allowCredentials)) {
      req.allowCredentials = req.allowCredentials.map((c: any) => ({
        ...c,
        id: b64urlToBuffer(c.id),
      }));
    }
    const cred = (await navigator.credentials.get({
      publicKey: req,
    })) as PublicKeyCredential;
    const asr = cred.response as AuthenticatorAssertionResponse;
    const finish = {
      id: cred.id,
      rawId: bufferToB64url(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: bufferToB64url(asr.clientDataJSON),
        authenticatorData: bufferToB64url(asr.authenticatorData),
        signature: bufferToB64url(asr.signature),
        userHandle: asr.userHandle ? bufferToB64url(asr.userHandle) : null,
      },
    };
    await authApi.post("/webauthn/authenticate/finish", finish, {
      headers: { Authorization: `Bearer ${t}` },
    });
    return true;
  }, [refreshToken]);

  const bootstrap = useCallback(async () => {
    let t = tokenRef.current;
    if (!t) t = await refreshToken();
    if (t) {
      await getMe(t);
      await connectEvents(t);
    }
    setLoading(false);
  }, [refreshToken, getMe, connectEvents]);

  useEffect(() => {
    bootstrap();
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [bootstrap]);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    return () => {
      setAuthTokenGetter(null);
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      username,
      login: loginFn,
      logout,
      isAuthenticated,
      loading,
      fetchWithAuth,
      connected,
      lastEvent,
      connectEvents,
      webauthnRegister,
      webauthnAuthenticate,
    }),
    [
      token,
      username,
      loginFn,
      logout,
      isAuthenticated,
      loading,
      fetchWithAuth,
      connected,
      lastEvent,
      connectEvents,
      webauthnRegister,
      webauthnAuthenticate,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
