import { Router } from "express";
import { jwks, alg as currentAlg } from "../oidc/keys";

const router = Router();

router.get("/jwks.json", async (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, immutable");
  res.type("application/json");
  res.json(await jwks());
});

router.get("/openid-configuration", (req, res) => {
  const base =
    process.env.AUTH_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const issuer = process.env.JWT_ISSUER || base;
  const requirePar = process.env.REQUIRE_PAR === "true";
  const cfg: any = {
    issuer,
    authorization_endpoint: `${base}/oauth2/authorize`,
    token_endpoint: `${base}/oauth2/token`,
    userinfo_endpoint: `${base}/oauth2/userinfo`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    pushed_authorization_request_endpoint: `${base}/oauth2/par`,
    grant_types_supported: ["authorization_code"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    id_token_signing_alg_values_supported: [currentAlg()],
    subject_types_supported: ["public"],
    scopes_supported: ["openid", "profile", "email"],
    dpop_signing_alg_values_supported: ["ES256", "RS256"],
  };
  if (requirePar) cfg.require_pushed_authorization_requests = true;
  res.set("Cache-Control", "public, max-age=300");
  res.type("application/json");
  res.json(cfg);
});

export default router;
