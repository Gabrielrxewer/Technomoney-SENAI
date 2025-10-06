import type { JWK } from "jose";
import { isReplay, markReplay } from "./store";
import { nowSec } from "./utils";
import { joseImport } from "../utils/joseDynamic";

export type DPoPResult = { jkt: string };

export async function verifyDPoP(
  proof: string,
  htm: string,
  htu: string
): Promise<DPoPResult> {
  const { importJWK, jwtVerify, calculateJwkThumbprint } = await joseImport();
  const { payload, protectedHeader } = await jwtVerify(
    proof,
    async (header) => {
      const jwk = header.jwk as JWK;
      return await importJWK(jwk, header.alg as string);
    },
    { clockTolerance: 5 }
  );
  if (String(payload.htm).toUpperCase() !== String(htm).toUpperCase())
    throw new Error("dpop_htm");
  if (String(payload.htu) !== String(htu)) throw new Error("dpop_htu");
  if (typeof payload.iat !== "number" || Math.abs(nowSec() - payload.iat) > 300)
    throw new Error("dpop_iat");
  const jti = String(payload.jti || "");
  if (!jti) throw new Error("dpop_jti");
  if (await isReplay(jti)) throw new Error("dpop_replay");
  await markReplay(jti, 600);
  const jkt = await calculateJwkThumbprint(protectedHeader.jwk as JWK);
  return { jkt };
}
