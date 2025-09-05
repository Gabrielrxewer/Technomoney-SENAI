import { Router } from "express";
import { jwks } from "../oidc/keys";

const router = Router();

router.get("/jwks.json", async (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, immutable");
  res.json(await jwks());
});

router.get("/openid-configuration", (req, res) => {
  const base =
    process.env.AUTH_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const cfg = {
    issuer: process.env.JWT_ISSUER || "auth",
    authorization_endpoint: `${base}/oauth2/authorize`,
    token_endpoint: `${base}/oauth2/token`,
    userinfo_endpoint: `${base}/oauth2/userinfo`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    pushed_authorization_request_endpoint: `${base}/oauth2/par`,
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
    dpop_signing_alg_values_supported: ["ES256", "RS256"],
    revocation_endpoint: `${base}/oauth2/revoke`,
  };
  res.json(cfg);
});

export default router;
