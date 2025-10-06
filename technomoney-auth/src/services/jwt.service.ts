import "dotenv/config";
import jwt, { SignOptions, VerifyOptions, JwtPayload } from "jsonwebtoken";
import ms from "ms";
import { v4 as uuid } from "uuid";
import { keysService } from "./keys.service";
import { getLogger } from "../utils/log/logger";
import { mask, maskJti, safeErr } from "../utils/log/log.helpers";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

type AccessData = {
  id: string;
  jti: string;
  sid?: string;
  scope?: unknown;
  acr?: unknown;
  amr?: unknown;
  username?: unknown;
  email?: unknown;
  exp?: number;
  cnf?: { jkt?: string };
};
type RefreshData = { id: string; jti: string };

const toSeconds = (v: unknown, fallback: number): number => {
  if (typeof v === "number" && Number.isFinite(v))
    return Math.max(0, Math.floor(v));
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return fallback;
    if (/^\d+$/.test(t)) return Math.max(0, parseInt(t, 10));
    const n = ms(t as any);
    if (typeof n === "number" && Number.isFinite(n))
      return Math.max(0, Math.floor(n / 1000));
  }
  return fallback;
};

export class JwtService {
  private log = getLogger({ svc: "JwtService" });
  private issuer = process.env.JWT_ISSUER || "technomoney";
  private audienceSign = (process.env.JWT_AUDIENCE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  private audienceVerify = (process.env.JWT_AUDIENCE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  private expiresIn = toSeconds(process.env.JWT_EXPIRES_IN, 300);
  private refreshExpiresIn = toSeconds(
    process.env.JWT_REFRESH_EXPIRES_IN,
    28800
  );
  private clockTolerance = Number(process.env.JWT_CLOCK_TOLERANCE || 5);
  private allowedSignAlgs = (
    process.env.JWT_ALLOWED_ALGS_SIGN ||
    process.env.JWT_ALLOWED_ALGS ||
    "RS256,ES256,PS256"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  private allowedVerifyAlgs = (
    process.env.JWT_ALLOWED_ALGS_VERIFY ||
    process.env.JWT_ALLOWED_ALGS ||
    "RS256,ES256,PS256"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  signAccess(id: string, extra: Record<string, unknown> = {}): string {
    const active = keysService.getActive();
    if (
      this.allowedSignAlgs.length &&
      !this.allowedSignAlgs.includes(String(active.alg))
    ) {
      this.log.error({
        evt: "jwt.sign.access.alg_blocked",
        kid: active.kid,
        alg: active.alg,
      });
      throw new Error("ALG_NOT_ALLOWED");
    }
    const jti = uuid();
    const acr = typeof extra.acr === "string" ? extra.acr : "aal1";
    const amr = Array.isArray(extra.amr) ? (extra.amr as string[]) : ["pwd"];
    const payload = { id, sub: id, jti, typ: "access", acr, amr, ...extra };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      keyid: active.kid,
    };
    const token = jwt.sign(payload, active.privatePem, opts);
    this.log.debug({
      evt: "jwt.sign.access.ok",
      kid: active.kid,
      alg: active.alg,
      sub: mask(id),
      jti: maskJti(jti),
      expSec: this.expiresIn,
      audSet: this.audienceSign.length > 0,
    });
    return token;
  }

  signRefresh(id: string): string {
    const active = keysService.getActive();
    if (
      this.allowedSignAlgs.length &&
      !this.allowedSignAlgs.includes(String(active.alg))
    ) {
      this.log.error({
        evt: "jwt.sign.refresh.alg_blocked",
        kid: active.kid,
        alg: active.alg,
      });
      throw new Error("ALG_NOT_ALLOWED");
    }
    const jti = uuid();
    const payload = { id, sub: id, jti, typ: "refresh" };
    const opts: SignOptions = {
      algorithm: active.alg as any,
      expiresIn: this.refreshExpiresIn,
      issuer: this.issuer,
      audience: this.audienceSign.length ? this.audienceSign : undefined,
      keyid: active.kid,
    };
    const token = jwt.sign(payload, active.privatePem, opts);
    this.log.debug({
      evt: "jwt.sign.refresh.ok",
      kid: active.kid,
      alg: active.alg,
      sub: mask(id),
      jti: maskJti(jti),
      expSec: this.refreshExpiresIn,
      audSet: this.audienceSign.length > 0,
    });
    return token;
  }

  verifyAccess(token: string): AccessData {
    const decoded = jwt.decode(token, { complete: true }) as {
      header?: { kid?: string; alg?: string };
    } | null;
    const kid = decoded?.header?.kid;
    if (!kid) {
      this.log.warn({ evt: "jwt.verify.access.missing_kid" });
      throw new Error("MISSING_KID");
    }
    const entry = keysService.getByKid(kid);
    if (!entry) {
      this.log.warn({ evt: "jwt.verify.access.unknown_kid", kid });
      throw new Error("UNKNOWN_KID");
    }
    if (
      this.allowedVerifyAlgs.length &&
      !this.allowedVerifyAlgs.includes(String(entry.alg))
    ) {
      this.log.warn({
        evt: "jwt.verify.access.alg_blocked",
        kid,
        alg: entry.alg,
      });
      throw new Error("ALG_NOT_ALLOWED");
    }
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
      audience: this.audienceVerify.length
        ? (this.audienceVerify as any)
        : undefined,
    };
    if (!opts.audience)
      this.log.debug({ evt: "jwt.verify.access.no_audience_enforced" });
    try {
      const d = jwt.verify(token, entry.publicPem, opts) as JwtPayload & {
        id: string;
        jti: string;
        typ: string;
        scope?: unknown;
        acr?: unknown;
        amr?: unknown;
      };
      if (d.typ !== "access") {
        this.log.warn({ evt: "jwt.verify.access.invalid_type", typ: d.typ });
        throw new Error("INVALID_TOKEN_TYPE");
      }
      const sub = String(d.id || d.sub || "");
      this.log.debug({
        evt: "jwt.verify.access.ok",
        kid,
        alg: entry.alg,
        sub: mask(sub),
        jti: maskJti(String(d.jti || "")),
      });
      const username =
        typeof (d as any).username === "string"
          ? (d as any).username
          : typeof (d as any).preferred_username === "string"
          ? (d as any).preferred_username
          : undefined;
      const email =
        typeof (d as any).email === "string"
          ? (d as any).email
          : undefined;
      const rawCnf = (d as any).cnf;
      const cnf =
        isPlainObject(rawCnf) && typeof rawCnf.jkt === "string"
          ? { jkt: rawCnf.jkt }
          : undefined;
      return {
        id: d.id,
        jti: d.jti,
        sid: typeof (d as any).sid === "string" ? (d as any).sid : undefined,
        scope: d.scope,
        acr: d.acr,
        amr: d.amr,
        username,
        email,
        exp: typeof d.exp === "number" ? d.exp : undefined,
        cnf,
      };
    } catch (e: any) {
      this.log.warn({
        evt: "jwt.verify.access.fail",
        kid,
        alg: entry.alg,
        err: safeErr(e),
      });
      throw e;
    }
  }

  verifyRefresh(token: string): RefreshData {
    const decoded = jwt.decode(token, { complete: true }) as {
      header?: { kid?: string; alg?: string };
    } | null;
    const kid = decoded?.header?.kid;
    if (!kid) {
      this.log.warn({ evt: "jwt.verify.refresh.missing_kid" });
      throw new Error("MISSING_KID");
    }
    const entry = keysService.getByKid(kid);
    if (!entry) {
      this.log.warn({ evt: "jwt.verify.refresh.unknown_kid", kid });
      throw new Error("UNKNOWN_KID");
    }
    if (
      this.allowedVerifyAlgs.length &&
      !this.allowedVerifyAlgs.includes(String(entry.alg))
    ) {
      this.log.warn({
        evt: "jwt.verify.refresh.alg_blocked",
        kid,
        alg: entry.alg,
      });
      throw new Error("ALG_NOT_ALLOWED");
    }
    const opts: VerifyOptions = {
      algorithms: [entry.alg as any],
      issuer: this.issuer,
      clockTolerance: this.clockTolerance,
      audience: this.audienceVerify.length
        ? (this.audienceVerify as any)
        : undefined,
    };
    if (!opts.audience)
      this.log.debug({ evt: "jwt.verify.refresh.no_audience_enforced" });
    try {
      const d = jwt.verify(token, entry.publicPem, opts) as JwtPayload & {
        id: string;
        jti: string;
        typ: string;
      };
      if (d.typ !== "refresh") {
        this.log.warn({ evt: "jwt.verify.refresh.invalid_type", typ: d.typ });
        throw new Error("INVALID_TOKEN_TYPE");
      }
      const sub = String(d.id || d.sub || "");
      this.log.debug({
        evt: "jwt.verify.refresh.ok",
        kid,
        alg: entry.alg,
        sub: mask(sub),
        jti: maskJti(String(d.jti || "")),
      });
      return { id: d.id, jti: d.jti };
    } catch (e: any) {
      this.log.warn({
        evt: "jwt.verify.refresh.fail",
        kid,
        alg: entry.alg,
        err: safeErr(e),
      });
      throw e;
    }
  }
}
