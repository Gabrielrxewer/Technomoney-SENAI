import { Request, Response, RequestHandler } from "express";
import { genCode, getPAR, saveCode, savePAR, takeCode } from "../oidc/store";
import { signAccess, signIdToken } from "../oidc/keys";
import { verifyPKCES256, nowSec } from "../oidc/utils";
import { verifyDPoP } from "../oidc/dpop";
import { getClient, isRedirectUriAllowed } from "../oidc/clients";

export const parHandler: RequestHandler = async (req, res) => {
  const p = req.body || {};
  const client_id = String(p.client_id || "");
  const redirect_uri = String(p.redirect_uri || "");
  const response_type = String(p.response_type || "");
  const scope = String(p.scope || "");
  const state = String(p.state || "");
  const code_challenge = String(p.code_challenge || "");
  const code_challenge_method = String(p.code_challenge_method || "S256");
  const nonce = p.nonce ? String(p.nonce) : undefined;
  if (response_type !== "code") {
    res.status(400).json({ error: "unsupported_response_type" });
    return;
  }
  if (code_challenge_method !== "S256" || !code_challenge) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const client = getClient(client_id);
  if (!client) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }
  if (!isRedirectUriAllowed(client, redirect_uri)) {
    res.status(400).json({ error: "invalid_redirect_uri" });
    return;
  }
  const params: Record<string, string> = {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  };
  if (nonce) params.nonce = nonce;
  const r = await savePAR(client_id, params, 300);
  res
    .status(201)
    .json({ request_uri: r.request_uri, expires_in: r.expires_in });
};

export const authorizeHandler: RequestHandler = async (
  req: any,
  res: Response
) => {
  const ru = String(req.query.request_uri || "");
  const u = req.user;
  if (!u) {
    res.status(401).send("unauthorized");
    return;
  }
  if (process.env.REQUIRE_PAR === "true" && !ru) {
    res.status(400).send("par_required");
    return;
  }
  let params: any = {};
  if (ru) {
    const par = await getPAR(ru);
    if (!par) {
      res.status(400).send("invalid_request_uri");
      return;
    }
    params = par.params;
  } else {
    params = req.query;
  }
  const client_id = String(params.client_id || "");
  const redirect_uri = String(params.redirect_uri || "");
  const state = String(params.state || "");
  const scope = String(params.scope || "openid");
  const nonce = params.nonce ? String(params.nonce) : undefined;
  const code_challenge = String(params.code_challenge || "");
  const code_challenge_method = String(params.code_challenge_method || "S256");
  const client = getClient(client_id);
  if (!client) {
    res.status(400).send("invalid_client");
    return;
  }
  if (!isRedirectUriAllowed(client, redirect_uri)) {
    res.status(400).send("invalid_redirect_uri");
    return;
  }
  if (code_challenge_method !== "S256" || !code_challenge) {
    res.status(400).send("invalid_pkce");
    return;
  }
  const code = genCode();
  const val = {
    sub: String(u.id),
    client_id,
    redirect_uri,
    scope: scope.split(" ").filter(Boolean),
    code_challenge,
    code_method: "S256" as const,
    nonce,
    acr: String(u.acr || "aal1"),
    exp: nowSec() + 300,
  };
  await saveCode(code, val, 300);
  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
};

export const tokenHandler: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const grant_type = String((req.body as any).grant_type || "");
  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }
  const code = String((req.body as any).code || "");
  const redirect_uri = String((req.body as any).redirect_uri || "");
  const code_verifier = String((req.body as any).code_verifier || "");
  const dpop = String(req.headers["dpop"] || "");
  const htm = "POST";
  const base =
    process.env.AUTH_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const htu = `${base}/oauth2/token`;
  const c = await takeCode(code);
  if (!c) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  if (c.redirect_uri !== redirect_uri) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  if (!verifyPKCES256(c.code_challenge, code_verifier)) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  let jkt: string | undefined;
  if (dpop) {
    try {
      jkt = (await verifyDPoP(dpop, htm, htu)).jkt;
    } catch {
      res.status(401).json({ error: "invalid_dpop" });
      return;
    }
  } else {
    if (process.env.REQUIRE_DPOP === "true") {
      res.status(401).json({ error: "dpop_required" });
      return;
    }
  }
  const cnf = jkt ? { cnf: { jkt } } : {};
  const acr = c.acr || "aal1";
  const amr = acr === "aal2" ? ["hwk", "user"] : ["pwd"];
  const access = await signAccess(c.sub, c.scope, { acr, amr, ...cnf });
  const id_token = await signIdToken(c.sub, c.client_id, c.nonce, { acr, amr });
  const body: any = {
    access_token: access,
    id_token,
    token_type: jkt ? "DPoP" : "Bearer",
    expires_in: 300,
    scope: c.scope.join(" "),
  };
  res.json(body);
};

export const userinfoHandler: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Bearer ") && !h.startsWith("DPoP ")) {
    res.status(401).end();
    return;
  }
  const token = h.replace(/^Bearer\s+|^DPoP\s+/, "");
  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(
    new URL(
      `${
        process.env.AUTH_BASE_URL || `${req.protocol}://${req.get("host")}`
      }/.well-known/jwks.json`
    )
  );
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    const sub = String(payload.sub || "");
    const acr = String((payload as any).acr || "");
    const amr = (payload as any).amr || [];
    res.json({ sub, acr, amr });
  } catch {
    res.status(401).end();
  }
};
