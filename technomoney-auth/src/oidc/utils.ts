import crypto from "crypto";
export function base64url(buf: Buffer | Uint8Array) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
export function sha256(data: string) {
  return crypto.createHash("sha256").update(data).digest();
}
export function verifyPKCES256(challenge: string, verifier: string) {
  return base64url(sha256(verifier)) === challenge;
}
export function nowSec() {
  return Math.floor(Date.now() / 1000);
}
