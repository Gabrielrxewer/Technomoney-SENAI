import { describe, it } from "node:test";
import assert from "node:assert";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveHttpLogLevel } from "./logger";

describe("resolveHttpLogLevel", () => {
  const req = {} as IncomingMessage;

  const buildRes = (statusCode: number) =>
    ({ statusCode } as unknown as ServerResponse<IncomingMessage>);

  it("retorna info para respostas de sucesso", () => {
    const level = resolveHttpLogLevel(req, buildRes(200));
    assert.strictEqual(level, "info");
  });

  it("retorna warn para respostas de cliente", () => {
    const level = resolveHttpLogLevel(req, buildRes(404));
    assert.strictEqual(level, "warn");
  });

  it("retorna error para respostas de servidor", () => {
    const level = resolveHttpLogLevel(req, buildRes(503));
    assert.strictEqual(level, "error");
  });

  it("retorna error quando há exceção", () => {
    const err = new Error("boom");
    const level = resolveHttpLogLevel(req, buildRes(200), err);
    assert.strictEqual(level, "error");
  });
});
