import { Request, Response, RequestHandler } from "express";
import { genCode, getPAR, saveCode, savePAR, takeCode } from "../oidc/store";
import { signAccess, signIdToken } from "../oidc/keys";
import { verifyPKCES256, nowSec } from "../oidc/utils";
import { verifyDPoP } from "../oidc/dpop";
import { getClient, isRedirectUriAllowed } from "../oidc/clients";
import { JwtService } from "../services/jwt.service";
import { SessionService } from "../services/session.service";
import { getLogger } from "../utils/log/logger";
import { mask, maskJti, safeErr } from "../utils/log/log.helpers";
import type { IncomingMessage } from "http";

const log = getLogger({ svc: "OidcController" });

type Deps = {
  jwt: JwtService;
  sessions: SessionService;
};

let deps: Deps = {
  jwt: new JwtService(),
  sessions: new SessionService(),
};

export function __setOidcControllerDeps(partial: Partial<Deps>) {
  deps = { ...deps, ...partial };
}

type ClientAuthResult =
  | { ok: true; clientId: string; method: "basic" | "mtls" }
  | { ok: false; status: number; error: string };

const isAuthError = (
  auth: ClientAuthResult
): auth is Extract<ClientAuthResult, { ok: false }> => auth.ok === false;

function parseBasicAuth(header: string) {
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.replace(/^Basic\s+/i, ""), "base64").toString(
      "utf8"
    );
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    const clientId = decoded.slice(0, idx);
    const clientSecret = decoded.slice(idx + 1);
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

function getAllowedClients() {
  const raw = String(process.env.INTROSPECTION_CLIENTS || "");
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, ...secretParts] = entry.split(":");
      const secret = secretParts.join(":");
      return { id: id || "", secret };
    })
    .filter((entry) => entry.id && entry.secret);
}

function getAllowedMtlsSubjects() {
  const raw = String(process.env.INTROSPECTION_MTLS_ALLOWED_CNS || "");
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function authenticateClient(req: Request): ClientAuthResult {
  const basic = parseBasicAuth(String(req.headers.authorization || ""));
  if (basic) {
    const allowed = getAllowedClients();
    const match = allowed.find(
      (entry) => entry.id === basic.clientId && entry.secret === basic.clientSecret
    );
    if (!match) {
      return { ok: false, status: 401, error: "invalid_client" };
    }
    return { ok: true, clientId: basic.clientId, method: "basic" };
  }
  const socket = req.socket as IncomingMessage["socket"] & {
    authorized?: boolean;
    getPeerCertificate?: () => any;
  };
  if (socket && socket.authorized && typeof socket.getPeerCertificate === "function") {
    try {
      const cert = socket.getPeerCertificate();
      if (cert && Object.keys(cert).length) {
        const cn = cert.subject?.CN;
        if (cn) {
          const allowed = getAllowedMtlsSubjects();
          if (allowed.includes(cn)) {
            return { ok: true, clientId: cn, method: "mtls" };
          }
        }
      }
    } catch (err) {
      log.warn({ evt: "oidc.introspect.mtls_error", err: safeErr(err) });
    }
  }
  return { ok: false, status: 401, error: "invalid_client" };
}

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

const normalizeScope = (scope: unknown) => {
  if (typeof scope === "string") return scope;
  if (Array.isArray(scope)) return scope.join(" ");
  return undefined;
};

export const introspectHandler: RequestHandler = async (req, res) => {
  const auth = authenticateClient(req);
  if (isAuthError(auth)) {
    log.warn({ evt: "oidc.introspect.unauthorized" });
    const errorAuth = auth;
    res.status(errorAuth.status).json({ error: errorAuth.error });
    return;
  }
  const token = String((req.body as any)?.token || "");
  if (!token) {
    log.warn({ evt: "oidc.introspect.missing_token", client: auth.clientId });
    res.json({ active: false });
    return;
  }
  let data: ReturnType<JwtService["verifyAccess"]> | undefined;
  try {
    data = deps.jwt.verifyAccess(token);
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      log.info({ evt: "oidc.introspect.expired", client: auth.clientId });
      res.json({ active: false });
      return;
    }
    log.warn({
      evt: "oidc.introspect.invalid",
      client: auth.clientId,
      err: safeErr(err),
    });
    res.json({ active: false });
    return;
  }
  if (!data?.sid) {
    log.warn({
      evt: "oidc.introspect.missing_sid",
      client: auth.clientId,
      sub: mask(data?.id),
      jti: maskJti(data?.jti),
    });
    res.json({ active: false });
    return;
  }
  const sessionActive = await deps.sessions.isActive(data.sid);
  if (!sessionActive) {
    log.info({
      evt: "oidc.introspect.revoked",
      client: auth.clientId,
      sub: mask(data.id),
      sid: mask(data.sid),
    });
    res.json({ active: false });
    return;
  }
  if (data.exp && data.exp * 1000 <= Date.now()) {
    log.info({ evt: "oidc.introspect.expired_clock", client: auth.clientId });
    res.json({ active: false });
    return;
  }
  const scope = normalizeScope(data.scope);
  const body: Record<string, unknown> = {
    active: true,
    sub: data.id,
    sid: data.sid,
    jti: data.jti,
  };
  if (scope) body.scope = scope;
  if (typeof data.username === "string") body.username = data.username;
  if (typeof data.email === "string") body.email = data.email;
  if (typeof data.exp === "number") body.exp = data.exp;
  if (data.acr) body.acr = data.acr;
  if (data.amr) body.amr = data.amr;
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
