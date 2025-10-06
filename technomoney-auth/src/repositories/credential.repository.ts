import { Credential } from "../models";

export class CredentialRepository {
  findByUser(userId: string) {
    return Credential.findAll({ where: { user_id: userId } });
  }
  findByCredentialId(credentialId: Buffer) {
    return Credential.findOne({ where: { credential_id: credentialId } });
  }
  async upsert(
    userId: string,
    credentialId: Buffer,
    publicKey: Buffer,
    counter: number,
    transports?: string[],
    deviceType?: string,
    backedUp?: boolean
  ) {
    const found = await Credential.findOne({
      where: { credential_id: credentialId },
    });
    if (found) {
      found.public_key = publicKey;
      found.counter = counter;
      found.transports = transports ? JSON.stringify(transports) : null;
      found.device_type = deviceType || null;
      found.backed_up = typeof backedUp === "boolean" ? backedUp : null;
      await found.save();
      return found;
    }
    return Credential.create({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter,
      transports: transports ? JSON.stringify(transports) : null,
      device_type: deviceType || null,
      backed_up: typeof backedUp === "boolean" ? backedUp : null,
    });
  }
  async updateCounter(credentialId: Buffer, counter: number) {
    const found = await Credential.findOne({
      where: { credential_id: credentialId },
    });
    if (found) {
      found.counter = counter;
      await found.save();
    }
  }
}
