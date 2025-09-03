import { createPublicKey } from "crypto";
import { keysService } from "../services/keys.service";
import { logger } from "../utils/logger";

const toBase64Url = (b: Buffer) =>
  b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const jwks = (_req: any, res: any) => {
  const pem = keysService.getPublic();
  const kid = keysService.getKid();
  const pub = createPublicKey(pem).export({ format: "jwk" }) as any;
  const jwk = {
    kty: "RSA",
    use: "sig",
    alg: "RS256",
    kid,
    n: toBase64Url(Buffer.from(pub.n, "base64")),
    e: toBase64Url(Buffer.from(pub.e, "base64")),
  };
  logger.debug({ kid }, "jwks.served");
  res.json({ keys: [jwk] });
};
