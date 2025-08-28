import axios, { AxiosInstance } from "axios";

function createApi(rawBaseURL: string): AxiosInstance {
  const baseURL = rawBaseURL.replace(/\/+$/, "");
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-CSRF-Token",
    timeout: 10_000,
  });

  instance.interceptors.request.use((config) => {
    if (baseURL.endsWith("/api/payments") && typeof config.url === "string") {
      config.url = config.url.replace(/^\/payments(\/|$)/, "/");
    }
    return config;
  });

  return instance;
}

export const api = createApi(import.meta.env.VITE_API_URL);
export const paymentsApi = createApi(import.meta.env.VITE_PAYMENTS_API_URL);
export const authApi = createApi(import.meta.env.VITE_AUTH_API_URL);
