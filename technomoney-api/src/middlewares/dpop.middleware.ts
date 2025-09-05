import { calculateJwkThumbprint, importJWK, jwtVerify, JWK } from "jose";

const seen = new Map<string, number>();
function now() {
  return Math.floor(Date.now() / 1000);
}
function base(req: any) {
  return `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`;
}
export async function requireDPoPIfBound(req: any, res: any, next: any) {
  const cnf = req.user?.payload?.cnf;
  if (!cnf?.jkt) return next();
  const proof = String(req.headers["dpop"] || "");
  if (!proof) return res.status(401).json({ message: "DPoP required" });
  try {
    const { payload, protectedHeader } = await jwtVerify(
      proof,
      async (header) => {
        const jwk = header.jwk as JWK;
        return await importJWK(jwk, header.alg as string);
      },
      { clockTolerance: 5 }
    );
    const htm = String(payload.htm || "").toUpperCase();
    const htu = String(payload.htu || "");
    const iat = Number(payload.iat || 0);
    const jti = String(payload.jti || "");
    if (htm !== String(req.method).toUpperCase())
      return res.status(401).json({ message: "invalid dpop htm" });
    if (htu !== base(req))
      return res.status(401).json({ message: "invalid dpop htu" });
    if (!iat || Math.abs(now() - iat) > 300)
      return res.status(401).json({ message: "invalid dpop iat" });
    if (!jti) return res.status(401).json({ message: "invalid dpop jti" });
    const exp = seen.get(jti);
    if (exp && exp > now()) return res.status(401).json({ message: "replay" });
    seen.set(jti, now() + 600);
    const jkt = await calculateJwkThumbprint(protectedHeader.jwk as JWK);
    if (jkt !== cnf.jkt)
      return res.status(401).json({ message: "dpop jkt mismatch" });
    next();
  } catch {
    res.status(401).json({ message: "invalid dpop" });
  }
}
