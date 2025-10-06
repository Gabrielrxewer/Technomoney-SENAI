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
const truthy = new Set(["1", "true", "yes", "on"]);

const shouldExposeVerboseDetails = (): boolean => {
  const flag = process.env.AUTH_VERBOSE_ERRORS;
  if (typeof flag === "string" && truthy.has(flag.trim().toLowerCase())) {
    return true;
  }
  const env = process.env.NODE_ENV;
  if (typeof env !== "string") return true;
  return env.trim().toLowerCase() !== "production";
};

const sanitizeValue = (
  value: unknown,
  verbose: boolean,
  seen: WeakSet<object>
): unknown => {
  if (value === null || typeof value === "undefined") {
    return value;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Error) {
    return toSafeError(value, verbose, seen);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    return value.map((item) => sanitizeValue(item, verbose, seen));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) {
      return "[Circular]";
    }
    seen.add(obj);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const sanitized = sanitizeValue(val, verbose, seen);
      if (typeof sanitized !== "undefined") {
        out[key] = sanitized;
      }
    }
    return out;
  }
  return undefined;
};

const toSafeError = (
  err: unknown,
  verbose: boolean,
  seen: WeakSet<object>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (!err) {
    return result;
  }
  if (typeof err === "string") {
    result.message = err;
    return result;
  }
  if (typeof err !== "object") {
    result.message = String(err);
    return result;
  }
  const obj = err as Record<string, unknown> & { stack?: unknown };
  seen.add(obj);
  if (typeof obj.name === "string") result.name = obj.name;
  if (typeof obj.message === "string") result.message = obj.message;
  if (typeof obj.code === "string" || typeof obj.code === "number") {
    result.code = obj.code;
  }
  if (typeof obj.status === "number") result.status = obj.status;
  if (typeof obj.statusCode === "number") result.statusCode = obj.statusCode;
  if (typeof obj.type === "string") result.type = obj.type;
  if (typeof obj.retryable === "boolean") result.retryable = obj.retryable;

  if (!verbose) {
    return result;
  }

  if (typeof obj.stack === "string") {
    result.stack = obj.stack;
  }

  const forwardKeys = ["cause", "originalError", "details", "context", "metadata"];
  for (const key of forwardKeys) {
    if (key in obj) {
      const sanitized = sanitizeValue(obj[key], verbose, seen);
      if (typeof sanitized !== "undefined") {
        result[key] = sanitized;
      }
    }
  }

  return result;
};

export const safeErr = (e: unknown) =>
  toSafeError(e, shouldExposeVerboseDetails(), new WeakSet<object>());
