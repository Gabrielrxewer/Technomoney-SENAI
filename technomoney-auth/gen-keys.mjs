import { generateKeyPair, exportSPKI, exportPKCS8, exportJWK } from "jose";
import { writeFileSync } from "node:fs";

const ALG = "ES256";
const tags = ["2025-09", "2026-03"];
const jwks = { keys: [] };

for (const tag of tags) {
  const { publicKey, privateKey } = await generateKeyPair(ALG, {
    extractable: true,
  });
  const kid = `jwt-${ALG}-${tag}`;
  const spki = await exportSPKI(publicKey);
  const pkcs8 = await exportPKCS8(privateKey);
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid, alg: ALG, use: "sig" });
  writeFileSync(`${kid}_public.pem`, spki);
  writeFileSync(`${kid}_private.pem`, pkcs8);
  jwks.keys.push(jwk);
}

writeFileSync("jwks.json", JSON.stringify(jwks, null, 2));
console.log("OK");
