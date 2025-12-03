import type { AxiosError } from "axios";
import { profileApi } from "./http";
import type { Profile, ProfileInput, ProfileResponse } from "../types/profile";

export async function fetchProfile(): Promise<Profile | null> {
  const response = await profileApi.get<ProfileResponse>("/profile");
  return response.data.profile;
}

export async function saveProfile(data: ProfileInput): Promise<Profile> {
  const response = await profileApi.put<ProfileResponse>("/profile", data);
  if (!response.data.profile) {
    throw new Error("Perfil não retornado pelo servidor");
  }
  return response.data.profile;
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as AxiosError<{ error?: string; message?: string }>;
    const data = err.response?.data;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    if (typeof data?.message === "string" && data.message.trim())
      return data.message;
  }
  return "Não foi possível salvar os dados do perfil.";
}
