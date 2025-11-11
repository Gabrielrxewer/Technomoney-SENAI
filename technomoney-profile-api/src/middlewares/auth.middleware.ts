import type { NextFunction, Request, Response } from "express";
import { JwtVerifierService } from "../services/jwt-verifier.service";
import { logger } from "../utils/logger";

const verifier = new JwtVerifierService();

const normalizeScope = (scope: string[] | string | undefined | null): string[] => {
  if (Array.isArray(scope)) return scope;
  return String(scope || "")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
};

const maskToken = (token: string) =>
  !token ? "" : token.length <= 10 ? "***" : `${token.slice(0, 4)}...${token.slice(-4)}`;

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenForLog = "";
  try {
    const h = String(req.headers.authorization || "");
    const token = h.startsWith("Bearer ")
      ? h.slice(7)
      : h.startsWith("DPoP ")
      ? h.slice(5)
      : "";
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    tokenForLog = token;
    const introspection = await verifier.verifyAccess(token);

    if (!introspection.active) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer realm="api", error="invalid_token", error_description="Token is inactive"'
      );
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const scopeList = normalizeScope(introspection.scope);
    const acr =
      typeof introspection.acr === "string" ? introspection.acr : undefined;

    if (acr === "step-up" || scopeList.includes("auth:stepup")) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer realm="api", error="insufficient_aal", error_description="Step-up token not allowed"'
      );
      res.status(401).json({ message: "Step-up token requires MFA" });
      return;
    }

    const username =
      typeof introspection.username === "string"
        ? introspection.username
        : typeof introspection.preferred_username === "string"
        ? introspection.preferred_username
        : undefined;

    (req as any).user = {
      id: typeof introspection.sub === "string" ? introspection.sub : "",
      jti: typeof introspection.jti === "string" ? introspection.jti : "",
      token,
      scope: scopeList,
      payload: introspection,
      acr,
      username,
      exp: typeof introspection.exp === "number" ? introspection.exp : undefined,
    };
    next();
  } catch (e: any) {
    logger.debug({ err: String(e), token: maskToken(tokenForLog) }, "auth.middleware.denied");
    res.setHeader(
      "WWW-Authenticate",
      'Bearer realm="api", error="invalid_token", error_description="Missing or invalid token"'
    );
    res.status(401).json({ message: "Unauthorized" });
  }
};
