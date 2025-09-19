import { JwtVerifierService } from "../services/jwt-verifier.service";
import { logger } from "../utils/logger";
const verifier = new JwtVerifierService();

const normalizeScope = (scope: string[] | string): string[] => {
  if (Array.isArray(scope)) return scope;
  return String(scope || "")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const authenticate = async (req: any, res: any, next: any) => {
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
    const { id, jti, scope, payload } = await verifier.verifyAccess(token);
    const scopeList = normalizeScope(scope);
    const acr = typeof (payload as any).acr === "string" ? (payload as any).acr : undefined;
    if (acr === "step-up" || scopeList.includes("auth:stepup")) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer realm="api", error="insufficient_aal", error_description="Step-up token not allowed"'
      );
      res.status(401).json({ message: "Step-up token requires MFA" });
      return;
    }
    const username =
      typeof (payload as any).username === "string"
        ? (payload as any).username
        : typeof (payload as any).preferred_username === "string"
        ? (payload as any).preferred_username
        : undefined;
    req.user = {
      id,
      jti,
      token,
      scope: scopeList,
      payload,
      acr,
      username,
      exp: typeof (payload as any).exp === "number" ? (payload as any).exp : undefined,
    };
    next();
  } catch (e: any) {
    logger.debug({ err: String(e) }, "auth.middleware.denied");
    res.setHeader(
      "WWW-Authenticate",
      'Bearer realm="api", error="invalid_token", error_description="Missing or invalid token"'
    );
    res.status(401).json({ message: "Unauthorized" });
  }
};
