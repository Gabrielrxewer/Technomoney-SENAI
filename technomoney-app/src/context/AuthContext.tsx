import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

interface UserPayload {
  id: string;
  username: string;
  exp: number;
}

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  fetchWithAuth: (
    input: string,
    config?: AxiosRequestConfig
  ) => Promise<AxiosResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
  });

  const validateTokenBackend = useCallback(
    async (token: string): Promise<UserPayload | null> => {
      try {
        const res = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data as UserPayload;
      } catch {
        return null;
      }
    },
    [api]
  );

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await api.post("/api/auth/refresh");
      const newToken = res.data.token;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      return newToken;
    } catch {
      logout();
      return null;
    }
  }, [api]);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUsername = localStorage.getItem("username");
      if (storedToken && storedUsername) {
        const user = await validateTokenBackend(storedToken);
        if (user) {
          setToken(storedToken);
          setUsername(JSON.parse(storedUsername));
        } else {
          logout();
        }
      } else {
        logout();
      }
      setLoading(false);
    };
    init();
  }, [validateTokenBackend]);

  const login = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", JSON.stringify(newUsername));
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
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
        return await api.request({ url, ...config });
      } catch (error: any) {
        if (error.response?.status === 401) {
          const newToken = await refreshAccessToken();
          if (!newToken) throw new Error("Sessão expirada");

          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };

          try {
            return await api.request({ url, ...config });
          } catch (err: any) {
            if (err.response?.status === 401) {
              logout();
              throw new Error("Sessão expirada");
            }
            throw err;
          }
        }
        throw error;
      }
    },
    [api, token, refreshAccessToken]
  );

  const isAuthenticated = !!token && !!username;

  if (loading) return null;

  return (
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
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
};
