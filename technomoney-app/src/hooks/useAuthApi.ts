import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { authApi } from "../services/http";
import { AuthResponse, LoginVars, RegisterVars } from "../types/auth";

type ApiError = AxiosError<{ message: string }>;

/* ---------- LOGIN ---------- */
export const useLogin = () =>
  useMutation<AuthResponse, ApiError, LoginVars>({
    mutationFn: (vars) =>
      authApi
        .post<AuthResponse>("/api/auth/login", vars)
        .then(({ data }) => data),
  });

/* ---------- REGISTER ---------- */
export const useRegister = () =>
  useMutation<void, ApiError, RegisterVars>({
    mutationFn: (vars) =>
      authApi.post("/api/auth/register", vars).then(() => undefined),
  });
