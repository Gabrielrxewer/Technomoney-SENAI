import type { NextFunction, Request, Response } from "express";

const maskToken = (token: string) =>
  !token ? "" : token.length <= 10 ? "***" : `${token.slice(0, 4)}...${token.slice(-4)}`;

type IntrospectionSuccess = {
  active: boolean;
  sub?: string;
  scope?: string;
  username?: string;
  email?: string;
  sid?: string;
};

type FetchLike = typeof fetch;

async function callIntrospection(
  token: string,
  fetchFn: FetchLike = fetch
): Promise<IntrospectionSuccess> {
  const url = process.env.AUTH_INTROSPECTION_URL;
  if (!url) {
    throw new Error("AUTH_INTROSPECTION_URL is not configured");
  }
  const clientId = process.env.AUTH_INTROSPECTION_CLIENT_ID || "";
  const clientSecret = process.env.AUTH_INTROSPECTION_CLIENT_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }
  const body = new URLSearchParams({
    token,
    token_type_hint: "access_token",
  });
  const res = await fetchFn(url, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) {
    throw new Error(`introspection request failed with status ${res.status}`);
  }
  return (await res.json()) as IntrospectionSuccess;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let tokenForLog = "";
  try {
    const header = String(req.header("authorization") || "");
    if (!header.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing bearer token" });
      return;
    }
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      res.status(401).json({ error: "invalid bearer token" });
      return;
    }
    tokenForLog = token;
    const result = await callIntrospection(token);
    if (!result.active) {
      res.status(401).json({ error: "token is not active" });
      return;
    }
    (req as any).auth = result;
    next();
  } catch (err) {
    console.error(
      "introspection failed for token",
      maskToken(tokenForLog),
      err
    );
    res.status(401).json({ error: "token introspection failed" });
  }
}

export const __test = { callIntrospection };
