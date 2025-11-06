import { generateKeyPair, exportSPKI, exportPKCS8, exportJWK } from "jose";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ALG = "ES256";
const tags = ["2025-09", "2026-03"];
const jwks = { keys: [] };

const OUTPUT_DIR = fileURLToPath(new URL("./keys", import.meta.url));

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const tag of tags) {
  const { publicKey, privateKey } = await generateKeyPair(ALG, {
    extractable: true,
  });
  const kid = `jwt-${ALG}-${tag}`;
  const spki = await exportSPKI(publicKey);
  const pkcs8 = await exportPKCS8(privateKey);
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid, alg: ALG, use: "sig" });
  writeFileSync(join(OUTPUT_DIR, `${kid}_public.pem`), spki, {
    encoding: "utf8",
    mode: 0o644,
  });
  writeFileSync(join(OUTPUT_DIR, `${kid}_private.pem`), pkcs8, {
    encoding: "utf8",
    mode: 0o600,
  });
  jwks.keys.push(jwk);
}

writeFileSync(join(OUTPUT_DIR, "jwks.json"), JSON.stringify(jwks, null, 2), {
  encoding: "utf8",
  mode: 0o600,
});
console.log("OK");
