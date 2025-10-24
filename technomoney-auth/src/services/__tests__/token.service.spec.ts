import assert from "node:assert/strict";
import test from "node:test";

const loggerPath = require.resolve("../../utils/log/logger");
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    getLogger: () => ({
      debug() {},
      info() {},
      warn() {},
      error() {},
    }),
  },
} as any;

const repoPath = require.resolve("../../repositories/refresh-token.repository");

class StubRefreshTokenRepository {
  public saved: { token: string; userId: string }[] = [];
  public revoked: string[] = [];
  public revokedAllForUser: string[] = [];
  public validated: string[] = [];
  public issued: string[] = [];

  async save(tokenHash: string, userId: string) {
    this.saved.push({ token: tokenHash, userId });
  }

  async revoke(tokenHash: string) {
    this.revoked.push(tokenHash);
  }

  async revokeAllForUser(userId: string) {
    this.revokedAllForUser.push(userId);
  }

  async isValid(tokenHash: string) {
    this.validated.push(tokenHash);
    return this.saved.find((entry) => entry.token === tokenHash) ? {} : null;
  }

  async wasIssued(tokenHash: string) {
    this.issued.push(tokenHash);
    return this.saved.find((entry) => entry.token === tokenHash) ? {} : null;
  }
}

let repoInstance: StubRefreshTokenRepository;

require.cache[repoPath] = {
  id: repoPath,
  filename: repoPath,
  loaded: true,
  exports: {
    RefreshTokenRepository: class {
      constructor() {
        repoInstance = new StubRefreshTokenRepository();
        return repoInstance as any;
      }
    },
  },
} as any;

const { TokenService } = require("../token.service");

test.after(() => {
  delete require.cache[loggerPath];
  delete require.cache[repoPath];
  delete require.cache[require.resolve("../token.service")];
});

test("TokenService persiste apenas hashes dos refresh tokens", async () => {
  const service = new TokenService();
  const repo = repoInstance;
  const token = "refresh-super-secreto";

  await service.save(token, "user-1");
  assert.equal(repo.saved.length, 1);
  const saved = repo.saved[0];
  assert.notEqual(saved.token, token);
  assert.equal(saved.token.length, 64);
  assert.equal(saved.userId, "user-1");

  const ok = await service.isValid(token);
  assert.equal(ok, true);
  assert.equal(repo.validated.at(-1), saved.token);

  const issued = await service.wasIssued(token);
  assert.equal(issued, true);
  assert.equal(repo.issued.at(-1), saved.token);

  await service.revoke(token);
  assert.equal(repo.revoked.at(-1), saved.token);

  await service.revokeAllForUser("user-1");
  assert.equal(repo.revokedAllForUser.at(-1), "user-1");
});

test("TokenService rejeita tokens desconhecidos mesmo após hash", async () => {
  const service = new TokenService();
  const repo = repoInstance;
  repo.saved = [];

  const unknown = "refresh-desconhecido";
  const ok = await service.isValid(unknown);
  assert.equal(ok, false);
  assert.equal(repo.validated.at(-1)?.length, 64);

  const issued = await service.wasIssued(unknown);
  assert.equal(issued, false);
  assert.equal(repo.issued.at(-1)?.length, 64);
});
