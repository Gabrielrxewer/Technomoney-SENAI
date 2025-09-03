import { generateKeyPairSync } from "crypto";
import { logger } from "../utils/logger";

class KeysService {
  private priv?: string;
  private pub?: string;
  private kid?: string;

  getPrivate(): string {
    if (this.priv) return this.priv;
    const p = process.env.JWT_PRIVATE_KEY_PEM || "";
    const q = process.env.JWT_PUBLIC_KEY_PEM || "";
    const kid = process.env.JWT_KID || "v1";
    if (p && q) {
      this.priv = p;
      this.pub = q;
      this.kid = kid;
      logger.debug({ kid }, "keys.loaded.env");
      return this.priv;
    }
    const kp = generateKeyPairSync("rsa", { modulusLength: 2048 });
    this.priv = kp.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    this.pub = kp.publicKey.export({ type: "spki", format: "pem" }).toString();
    this.kid = kid;
    logger.debug({ kid }, "keys.generated.ephemeral");
    return this.priv;
  }

  getPublic(): string {
    if (!this.pub) this.getPrivate();
    return this.pub as string;
  }

  getKid(): string {
    if (!this.kid) this.getPrivate();
    return this.kid as string;
  }
}

export const keysService = new KeysService();
