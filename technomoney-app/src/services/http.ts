import axios, { AxiosInstance } from "axios";

function createApi(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    withCredentials: true,
    timeout: 10_000,
  });
}

export const api = createApi(import.meta.env.VITE_API_URL);
export const paymentsApi = createApi(import.meta.env.VITE_PAYMENTS_API_URL);
export const authApi = createApi(import.meta.env.VITE_AUTH_API_URL);
