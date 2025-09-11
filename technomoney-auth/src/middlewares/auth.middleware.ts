import { JwtService } from "../services/jwt.service";
import { logger } from "../utils/log/logger";

const jwtSvc = new JwtService();

export const authenticate = (req: any, res: any, next: any) => {
  try {
    const auth = String(req.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id, jti, scope } = jwtSvc.verifyAccess(token);
    req.user = { id, jti, scope };
    next();
  } catch (e) {
    logger.debug({ err: String(e) }, "auth.middleware.denied");
    res.status(401).json({ message: "Unauthorized" });
  }
};
