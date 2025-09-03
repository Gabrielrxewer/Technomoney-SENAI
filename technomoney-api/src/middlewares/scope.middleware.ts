import { logger } from "../utils/logger";

const parseScopes = (s: string) =>
  s
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean);

export const requireScopes = (...need: string[]) => {
  return (req: any, res: any, next: any) => {
    const haveStr = String(req.user?.scope || "");
    const have = new Set(parseScopes(haveStr));
    const ok = need.every((n) => have.has(n));
    if (!ok) {
      logger.debug({ need, have: Array.from(have) }, "auth.scope.denied");
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="api", error="insufficient_scope", scope="${need.join(
          " "
        )}"`
      );
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
};
