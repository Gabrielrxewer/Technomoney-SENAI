// src/utils/log.helpers.ts
import jwt from "jsonwebtoken";

export const mask = (s?: string) =>
  !s ? "" : s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
export const maskEmail = (e?: string) => {
  if (!e) return "";
  const [user, domain] = e.split("@");
  if (!domain) return mask(e);
  const u = user.length <= 2 ? "*" : `${user.slice(0, 2)}***`;
  return `${u}@${domain}`;
};
export const getJti = (t: string) => {
  try {
    const d = jwt.decode(t);
    if (d && typeof d === "object" && "jti" in d) {
      const { jti } = d as { jti?: string };
      return jti || "";
    }
    return "";
  } catch {
    return "";
  }
};
export const maskJti = (j?: string) =>
  !j ? "" : j.length <= 8 ? "***" : `${j.slice(0, 4)}...${j.slice(-4)}`;
export const safeErr = (e: any) => ({
  name: e?.name,
  message: e?.message,
  code: e?.code,
});
