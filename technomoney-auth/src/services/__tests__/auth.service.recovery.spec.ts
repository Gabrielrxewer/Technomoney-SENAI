import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "crypto";

const stubModule = (specifier: string, exports: unknown) => {
  const resolved = require.resolve(specifier);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
};

stubModule("../../utils/log/logger", {
  getLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
  }),
});

stubModule("../../utils/log/logging-context", {
  getLogContext: () => ({}),
});

const hash = async (value: string) => `hashed:${value}`;
const verify = async (value: string, hashed: string) => hashed === `hashed:${value}`;

stubModule("../../utils/password.util", {
  hashPassword: hash,
  comparePassword: verify,
});

const sequelizeStub = {
  async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return fn({});
  },
};

stubModule("../../models", {
  sequelize: sequelizeStub,
});

import { AuthService } from "../auth.service";
import { hashPassword, comparePassword } from "../../utils/password.util";

test("requestPasswordReset persiste token único e envia e-mail", async () => {
  const fixedNow = new Date("2025-01-01T00:00:00Z");
  process.env.PASSWORD_RESET_URL = "https://app.example/reset";
  process.env.RESET_TOKEN_TTL = "1800";
  const user = {
    id: randomUUID(),
    email: "user@example.com",
    username: null,
    password_hash: await hashPassword("InitialPass!1"),
    email_verified: false,
  };
  const created: any[] = [];
  const emails: any[] = [];
  const service = new AuthService({
    userRepository: {
      async findByEmail(email: string) {
        assert.equal(email, user.email);
        return user;
      },
    } as any,
    passwordResetRepository: {
      async invalidateAllForUser(userId: string) {
        assert.equal(userId, user.id);
      },
      async create(data: any) {
        created.push(data);
        return data;
      },
    } as any,
    emailService: {
      async sendPasswordReset(to: string, link: string, expiresAt: Date) {
        emails.push({ to, link, expiresAt });
      },
      async sendEmailVerification() {},
    },
    now: () => new Date(fixedNow),
  });

  await service.requestPasswordReset(user.email);

  assert.equal(created.length, 1);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, user.email);
  const url = new URL(emails[0].link);
  const token = url.searchParams.get("token");
  assert.ok(token, "token deve estar presente no link");
  const [tokenId, secret] = token!.split(".");
  assert.equal(created[0].id, tokenId);
  assert.ok(secret);
  assert.notEqual(created[0].tokenHash, secret);
  assert.ok(await comparePassword(secret, created[0].tokenHash));
  const ttlMinutes =
    (emails[0].expiresAt.getTime() - fixedNow.getTime()) / 60000;
  assert.ok(ttlMinutes <= 60);
});

test("resetPassword rejeita token expirado", async () => {
  const now = new Date();
  const expiredRecord = {
    id: randomUUID(),
    user_id: randomUUID(),
    token_hash: await hashPassword("secret"),
    expires_at: new Date(now.getTime() - 1000),
    used_at: null,
  };
  const service = new AuthService({
    userRepository: {} as any,
    passwordResetRepository: {
      async findById(id: string) {
        assert.equal(id, expiredRecord.id);
        return expiredRecord;
      },
    } as any,
    tokenService: {
      async revokeAllForUser() {},
    } as any,
    sessionService: {
      async revokeAllForUser() {},
    } as any,
    now: () => now,
  });

  await assert.rejects(
    () => service.resetPassword(`${expiredRecord.id}.secret`, "NovaSenha!2"),
    (err: any) => err?.code === "TOKEN_EXPIRED"
  );
});

test("resetPassword atualiza credenciais e revoga sessões", async () => {
  const now = new Date();
  const userId = randomUUID();
  const secret = "secret-reset";
  const hashedSecret = await hashPassword(secret);
  const record = {
    id: randomUUID(),
    user_id: userId,
    token_hash: hashedSecret,
    expires_at: new Date(now.getTime() + 10 * 60 * 1000),
    used_at: null,
  };
  let updatedPassword = "";
  const tokenRevocations: string[] = [];
  const sessionRevocations: string[] = [];
  let markedUsed = false;
  const service = new AuthService({
    userRepository: {
      async updatePassword(id: string, pwd: string) {
        assert.equal(id, userId);
        updatedPassword = pwd;
        return [1];
      },
    } as any,
    passwordResetRepository: {
      async findById(id: string) {
        return id === record.id ? record : null;
      },
      async markUsed(id: string) {
        assert.equal(id, record.id);
        markedUsed = true;
      },
    } as any,
    tokenService: {
      async revokeAllForUser(id: string) {
        tokenRevocations.push(id);
      },
    } as any,
    sessionService: {
      async revokeAllForUser(id: string) {
        sessionRevocations.push(id);
      },
    } as any,
    now: () => now,
  });

  await service.resetPassword(`${record.id}.${secret}`, "SenhaForte!9");

  assert.ok(markedUsed);
  assert.equal(tokenRevocations[0], userId);
  assert.equal(sessionRevocations[0], userId);
  assert.ok(updatedPassword.length > 0);
  assert.notEqual(updatedPassword, "SenhaForte!9");
});

test("requestEmailVerification envia link seguro", async () => {
  process.env.EMAIL_VERIFICATION_URL = "https://app.example/verify";
  process.env.EMAIL_VERIFICATION_TOKEN_TTL = "1200";
  const user = {
    id: randomUUID(),
    email: "verify@example.com",
    username: null,
    password_hash: await hashPassword("Senha!123"),
    email_verified: false,
  };
  const created: any[] = [];
  const emails: any[] = [];
  const service = new AuthService({
    userRepository: {
      async findByEmail(email: string) {
        assert.equal(email, user.email);
        return user;
      },
    } as any,
    emailVerificationRepository: {
      async invalidateAllForUser(id: string) {
        assert.equal(id, user.id);
      },
      async create(data: any) {
        created.push(data);
        return data;
      },
    } as any,
    emailService: {
      async sendPasswordReset() {},
      async sendEmailVerification(to: string, link: string, expiresAt: Date) {
        emails.push({ to, link, expiresAt });
      },
    },
  });

  await service.requestEmailVerification(user.email);

  assert.equal(created.length, 1);
  assert.equal(emails.length, 1);
  const token = new URL(emails[0].link).searchParams.get("token");
  assert.ok(token);
  const [tokenId, secret] = token!.split(".");
  assert.equal(created[0].id, tokenId);
  assert.ok(await comparePassword(secret, created[0].tokenHash));
});

test("verifyEmail falha com token inválido", async () => {
  const service = new AuthService({
    emailVerificationRepository: {
      async findById() {
        return null;
      },
    } as any,
  });
  await assert.rejects(
    () => service.verifyEmail(`${randomUUID()}.secret`),
    (err: any) => err?.code === "INVALID_TOKEN"
  );
});

test("verifyEmail confirma token válido", async () => {
  const userId = randomUUID();
  const secret = "ver-secret";
  const record = {
    id: randomUUID(),
    user_id: userId,
    token_hash: await hashPassword(secret),
    expires_at: new Date(Date.now() + 600000),
    confirmed_at: null,
  };
  let confirmed = false;
  let marked = false;
  const service = new AuthService({
    emailVerificationRepository: {
      async findById(id: string) {
        return id === record.id ? record : null;
      },
      async confirm(id: string) {
        assert.equal(id, record.id);
        confirmed = true;
      },
    } as any,
    userRepository: {
      async markEmailVerified(id: string) {
        assert.equal(id, userId);
        marked = true;
        return [1];
      },
    } as any,
  });

  await service.verifyEmail(`${record.id}.${secret}`);

  assert.ok(confirmed);
  assert.ok(marked);
});
