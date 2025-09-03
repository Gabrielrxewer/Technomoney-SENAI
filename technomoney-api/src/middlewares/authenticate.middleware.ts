import { JwtVerifierService } from "../services/jwt-verifier.service";
import { logger } from "../utils/logger";

const verifier = new JwtVerifierService();

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const h = String(req.headers.authorization || "");
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id, jti, scope, payload } = await verifier.verifyAccess(token);
    req.user = { id, jti, scope, payload };
    next();
  } catch (e: any) {
    logger.debug({ err: String(e) }, "auth.middleware.denied");
    res.setHeader(
      "WWW-Authenticate",
      'Bearer realm="api", error="invalid_token", error_description="Missing or invalid Bearer token"'
    );
    res.status(401).json({ message: "Unauthorized" });
  }
};
