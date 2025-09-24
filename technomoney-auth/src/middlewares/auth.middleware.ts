import { JwtService } from "../services/jwt.service";
import { logger } from "../utils/log/logger";

const jwtSvc = new JwtService();

const normalizeScope = (scope: unknown): string[] => {
  if (Array.isArray(scope)) {
    return scope.filter((s): s is string => typeof s === "string");
  }
  if (typeof scope === "string") {
    return scope
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const authenticate = (req: any, res: any, next: any) => {
  try {
    const auth = String(req.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id, jti, scope, acr, amr, username, email, exp } =
      jwtSvc.verifyAccess(token);
    const scopeList = normalizeScope(scope);
    const normalizedAcr =
      typeof acr === "string" ? acr.trim().toLowerCase() : undefined;
    req.user = {
      id,
      jti,
      scope: scopeList,
      acr: normalizedAcr,
      amr,
      token,
      username: typeof username === "string" ? username : undefined,
      email: typeof email === "string" ? email : undefined,
      exp,
    };
    req.authContext = {
      scope: scopeList,
      acr: normalizedAcr ?? "aal1",
    };
    next();
  } catch (e) {
    logger.debug({ err: String(e) }, "auth.middleware.denied");
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireFullSession = (req: any, res: any, next: any) => {
  const user = req.user as { acr?: string; scope?: string[] } | undefined;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const acr = user.acr;
  const scope = Array.isArray(user.scope) ? user.scope : [];
  if (acr === "step-up" || scope.includes("auth:stepup")) {
    res.status(401).json({ stepUp: "totp" });
    return;
  }
  next();
};
