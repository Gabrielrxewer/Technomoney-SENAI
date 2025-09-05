import { RequestHandler } from "express";
import { jwks as oidcJwks } from "../oidc/keys";

export const jwks: RequestHandler = async (_req, res) => {
  const k = await oidcJwks();
  res.json(k);
};
