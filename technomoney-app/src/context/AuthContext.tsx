import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { authApi } from "../services/http";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface UserPayload {
  id: string;
  username: string;
  exp: number;
}

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  fetchWithAuth: (
    input: string,
    config?: AxiosRequestConfig
  ) => Promise<AxiosResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const queryClient = new QueryClient();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  const logout = useCallback(async () => {
    try {
      await authApi.get("auth/csrf");
      await authApi.post("auth/logout");
    } catch {}
    setToken(null);
    setUsername(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  }, []);

  const validateTokenBackend = useCallback(
    async (t: string): Promise<UserPayload | null> => {
      try {
        const res = await authApi.get("auth/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        return res.data as UserPayload;
      } catch {
        return null;
      }
    },
    []
  );

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await authApi.post("auth/refresh");
      const newToken = res.data.token;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      return newToken;
    } catch {
      await logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const init = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUsername = localStorage.getItem("username");
      if (storedToken && storedUsername) {
        const user = await validateTokenBackend(storedToken);
        if (user) {
          setToken(storedToken);
          setUsername(JSON.parse(storedUsername));
        } else {
          await logout();
        }
      } else {
        await logout();
      }
      setLoading(false);
    };
    init();
  }, [validateTokenBackend, logout]);

  const login = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", JSON.stringify(newUsername));
  };

  const fetchWithAuth = useCallback(
    async (
      url: string,
      config: AxiosRequestConfig = {}
    ): Promise<AxiosResponse> => {
      if (!token) throw new Error("Usuário não autenticado");
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      try {
        return await authApi.request({ url, ...config });
      } catch (error: any) {
        if (error.response?.status === 401) {
          const newToken = await refreshAccessToken();
          if (!newToken) throw new Error("Sessão expirada");
          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };
          try {
            return await authApi.request({ url, ...config });
          } catch (err: any) {
            if (err.response?.status === 401) {
              await logout();
              throw new Error("Sessão expirada");
            }
            throw err;
          }
        }
        throw error;
      }
    },
    [token, refreshAccessToken, logout]
  );

  const isAuthenticated = !!token && !!username;

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          token,
          username,
          login,
          logout,
          isAuthenticated,
          loading,
          fetchWithAuth,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
};
