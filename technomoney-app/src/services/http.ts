import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const CSRF_COOKIE = (import.meta.env.VITE_CSRF_COOKIE_NAME as string) || "csrf";
const CSRF_HEADER =
  (import.meta.env.VITE_CSRF_HEADER_NAME as string) || "x-csrf-token";
const CSRF_PATH = (import.meta.env.VITE_CSRF_PATH as string) || "/auth/csrf";
const inflightByBase = new Map<string, Promise<void>>();

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/([.*+?^${}()|[\]\\])/g, "\\$1") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf(
  instance: AxiosInstance,
  baseURL: string
): Promise<void> {
  if (inflightByBase.has(baseURL)) return inflightByBase.get(baseURL)!;
  const p = instance
    .get(CSRF_PATH, {
      withCredentials: true,
      headers: { "x-skip-csrf": "1" } as any,
      timeout: 5000,
    } as AxiosRequestConfig)
    .then(() => {})
    .catch(() => {})
    .finally(() => {
      inflightByBase.delete(baseURL);
    });
  inflightByBase.set(baseURL, p);
  return p;
}

type AuthTokenGetter = () => string | null;

let authTokenGetter: AuthTokenGetter | null = null;

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  authTokenGetter = getter;
}

function getAuthToken(): string | null {
  if (!authTokenGetter) return null;
  try {
    return authTokenGetter();
  } catch {
    return null;
  }
}

function createApi(rawBaseURL: string): AxiosInstance {
  const baseURL = rawBaseURL.replace(/\/+$/, "");
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    xsrfCookieName: CSRF_COOKIE,
    xsrfHeaderName: CSRF_HEADER,
    timeout: 10000,
  });

  instance.interceptors.request.use(async (config) => {
    const skip =
      (config.headers as any)?.["x-skip-csrf"] || (config as any).__skipCsrf;
    if (!skip) {
      const has = !!readCookie(CSRF_COOKIE);
      if (!has) await ensureCsrf(instance, baseURL);
      const tokenCsrf = readCookie(CSRF_COOKIE);
      if (tokenCsrf) {
        config.headers = config.headers || {};
        (config.headers as any)[CSRF_HEADER] = tokenCsrf;
      }
    }
    const t = getAuthToken();
    if (t) {
      config.headers = config.headers || {};
      if (!(config.headers as any).Authorization)
        (config.headers as any).Authorization = `Bearer ${t}`;
    }
    if (baseURL.endsWith("/api/payments") && typeof config.url === "string") {
      config.url = config.url.replace(/^\/payments(\/|$)/, "/");
    }
    return config;
  });

  return instance;
}

export const api = createApi(import.meta.env.VITE_API_URL as string);
export const paymentsApi = createApi(
  import.meta.env.VITE_PAYMENTS_API_URL as string
);
export const authApi = createApi(import.meta.env.VITE_AUTH_API_URL as string);
export function getTokenForQueryKey(): string | null {
  return getAuthToken();
}
