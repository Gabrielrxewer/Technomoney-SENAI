import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { requestId?: string; ip?: string; ua?: string };
const storage = new AsyncLocalStorage<Ctx>();

export const runWithLogContext = <T>(ctx: Ctx, fn: () => T) =>
  storage.run(ctx, fn);
export const getLogContext = (): Ctx => storage.getStore() || {};
