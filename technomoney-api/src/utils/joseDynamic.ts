export function joseImport(): Promise<typeof import("jose")> {
  const dynamicImport = new Function("s", "return import(s)") as (
    s: string
  ) => Promise<any>;
  return dynamicImport("jose");
}
