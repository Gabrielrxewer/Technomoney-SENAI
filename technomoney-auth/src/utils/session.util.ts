import crypto from "crypto";

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function deriveSid(refreshToken: string): string {
  return hashRefreshToken(refreshToken);
}
