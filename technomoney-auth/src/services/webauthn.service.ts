import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import base64url from "base64url";
import { CredentialRepository } from "../repositories/credential.repository";
import { getRedis } from "./redis.service";



export class WebAuthnService {
  private rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  private rpName = process.env.WEBAUTHN_RP_NAME || "Technomoney";
  private origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";
  private creds = new CredentialRepository();
  private challengeTtl = 300
  private async setChallenge(kind: "reg" | "auth", userId: string, value: string) {
    const r = await getRedis()
    if (r) {
      await r.setEx(`webauthn:${kind}:${userId}`, this.challengeTtl, value)
      return
    }
    ;(this as any)[`__${kind}`] = (this as any)[`__${kind}`] || new Map<string,string>()
    ;(this as any)[`__${kind}`].set(userId, value)
  }
  private async getChallenge(kind: "reg" | "auth", userId: string) {
    const r = await getRedis()
    if (r) {
      const v = await r.get(`webauthn:${kind}:${userId}`)
      return v || ""
    }
    const m = (this as any)[`__${kind}`] as Map<string,string> | undefined
    return m?.get(userId) || ""
  }
  private async delChallenge(kind: "reg" | "auth", userId: string) {
    const r = await getRedis()
    if (r) {
      await r.del(`webauthn:${kind}:${userId}`)
      return
    }
    const m = (this as any)[`__${kind}`] as Map<string,string> | undefined
    if (m) m.delete(userId)
  }

  
  async startRegistration(userId: string, username: string) {
    const existing = await this.creds.findByUser(userId);
    const userIDBytes = new TextEncoder().encode(userId);
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: userIDBytes,
      userName: username || userId,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existing.map((c) => ({
        id: Buffer.from(c.credential_id),
        type: "public-key",
      })),
    });
    await this.setChallenge("reg", userId, options.challenge);
    return options;
  }

  async finishRegistration(userId: string, body: any) {
    const expectedChallenge = await this.getChallenge("reg", userId);
    const opts: any = {
      response: body,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    };
    const verification = await verifyRegistrationResponse(opts);
    if (!verification.verified || !verification.registrationInfo)
      return { verified: false };
    const regInfo: any = verification.registrationInfo;
    const credential = regInfo.credential;
    const counter = Number(regInfo.counter ?? 0);
    await this.creds.upsert(
      userId,
      Buffer.from(credential.id),
      Buffer.from(credential.publicKey),
      counter,
      body?.response?.transports,
      regInfo.credentialDeviceType,
      regInfo.credentialBackedUp
    );
    await this.delChallenge("reg", userId);
    return { verified: true };
  }

  async startAuthentication(userId: string) {
    const existing = await this.creds.findByUser(userId);
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: "preferred",
      allowCredentials: existing.map((c) => ({
        id: Buffer.from(c.credential_id),
        type: "public-key",
      })),
    });
    await this.setChallenge("auth", userId, options.challenge);
    return options;
  }

  async finishAuthentication(userId: string, body: any) {
    const expectedChallenge = await this.getChallenge("auth", userId);
    const existing = await this.creds.findByUser(userId);
    const credId = body?.id ? base64url.toBuffer(body.id) : Buffer.alloc(0);
    const found = existing.find((c) =>
      Buffer.from(c.credential_id).equals(Buffer.from(credId))
    );
    if (!found) return { verified: false };
    const opts: any = {
      response: body,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      authenticator: {
        credentialID: Buffer.from(found.credential_id),
        credentialPublicKey: Buffer.from(found.public_key),
        counter: Number(found.counter),
        transports: undefined,
      },
    };
    const verification = await verifyAuthenticationResponse(opts);
    if (!verification.verified) return { verified: false };
    const info: any = verification.authenticationInfo;
    if (info && typeof info.newCounter === "number") {
      await this.creds.updateCounter(
        Buffer.from(found.credential_id),
        info.newCounter
      );
    }
    await this.delChallenge("auth", userId);
    return { verified: true };
  }
}
