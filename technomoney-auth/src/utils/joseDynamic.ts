export function joseImport(): Promise<typeof import("jose")> {
  if (process.env.JOSE_STUB === "1") {
    const mod = require("./joseStub");
    return Promise.resolve(mod.joseStub());
  }
  const dynamicImport = new Function("s", "return import(s)") as (
    s: string
  ) => Promise<any>;
  return dynamicImport("jose");
}
