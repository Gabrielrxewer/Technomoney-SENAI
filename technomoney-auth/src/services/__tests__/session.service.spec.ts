import assert from "node:assert/strict";
import test from "node:test";
import { SessionService } from "../session.service";
import * as sessionUtil from "../../utils/session.util";

test("SessionService.start persiste sid derivado com hash SHA-256", async () => {
  const service = new SessionService() as unknown as {
    start(userId: string, refreshToken: string): Promise<string>;
    repo: {
      create: (
        sid: string,
        userId: string,
        refreshHash: string,
        tx?: unknown
      ) => Promise<void> | void;
    };
  };

  const calls: Array<{ sid: string; userId: string; refreshHash: string; tx?: unknown }> = [];
  service.repo = {
    async create(sid, userId, refreshHash, tx) {
      calls.push({ sid, userId, refreshHash, tx });
    },
  };

  const refreshToken = "refresh-token-value";
  const expectedHash = sessionUtil.hashRefreshToken(refreshToken);
  const sid = await service.start("user-123", refreshToken);

  assert.equal(sid, expectedHash);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, "user-123");
  assert.equal(calls[0].sid, expectedHash);
  assert.equal(calls[0].refreshHash, expectedHash);
  assert.equal(calls[0].tx, undefined);
});

test("SessionService.revokeByRefreshToken sempre usa hash derivado", async () => {
  const service = new SessionService() as unknown as {
    revokeByRefreshToken(refreshToken: string): Promise<void>;
    repo: {
      revokeByRefreshHash: (hash: string, tx?: unknown) => Promise<void> | void;
    };
  };

  const received: string[] = [];
  service.repo = {
    async revokeByRefreshHash(hash) {
      received.push(hash);
    },
  };

  const refreshToken = "another-token";
  const expectedHash = sessionUtil.hashRefreshToken(refreshToken);
  await service.revokeByRefreshToken(refreshToken);

  assert.deepEqual(received, [expectedHash]);
});
