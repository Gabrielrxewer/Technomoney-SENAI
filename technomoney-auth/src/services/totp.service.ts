import crypto from "crypto";
import base64url from "base64url";
import { getRedis } from "./redis.service";
import { getLogger } from "../utils/log/logger";
import { getLogContext } from "../utils/log/logging-context";
import { mask } from "../utils/log/log.helpers";

const MIN_TOTP_KEY_LENGTH = 32;
const keyStrengthMatchers = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/];

let cachedNormalizedKey: string | null = null;

const normalizeTotpKey = (): string => {
  if (cachedNormalizedKey) return cachedNormalizedKey;

  const raw = process.env.TOTP_ENC_KEY;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error(
      "TOTP_ENC_KEY is required and must be a strong secret (min. 32 characters)."
    );
  }

  const normalized = raw.trim();
  if (normalized.length < MIN_TOTP_KEY_LENGTH) {
    throw new Error(
      `TOTP_ENC_KEY must be at least ${MIN_TOTP_KEY_LENGTH} characters long.`
    );
  }

  const satisfiedChecks = keyStrengthMatchers.reduce(
    (acc, matcher) => acc + Number(matcher.test(normalized)),
    0
  );
  if (satisfiedChecks < 3) {
    throw new Error(
      "TOTP_ENC_KEY must mix at least three character groups (upper, lower, number, symbol)."
    );
  }

  cachedNormalizedKey = normalized;
  return normalized;
};

export const ensureTotpEncKey = (): string => normalizeTotpKey();

const period = 30;
const digits = 6;

const b32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32Map: Record<string, number> = Object.fromEntries(
  b32Alphabet.split("").map((c, i) => [c, i])
);

const b32Pad = (s: string) => {
  const r = s.length % 8;
  return r === 0 ? s : s + "=".repeat(8 - r);
};

const base32Encode = (buf: Buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += b32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += b32Alphabet[(value << (5 - bits)) & 31];
  while (output.length % 8 !== 0) output += "=";
  return output;
};

const base32Decode = (s: string) => {
  const str = b32Pad(s.toUpperCase().replace(/[^A-Z2-7]/g, ""));
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "=") break;
    const v = b32Map[ch];
    if (v === undefined) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

const hotp = (secret: Buffer, counter: number) => {
  const buf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff;
    counter = counter >> 8;
  }
  const h = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(code % mod).padStart(digits, "0");
};

const verifyTotp = (
  secret: Buffer,
  code: string,
  tsSec: number,
  window = 1
) => {
  const base = Math.floor(tsSec / period);
  const target = String(code || "").padStart(digits, "0");
  for (let w = -window; w <= window; w++) {
    const counter = base + w;
    if (counter < 0) continue;
    if (hotp(secret, counter) === target) {
      return {
        ok: true,
        counter,
      } as const;
    }
  }
  return { ok: false as const, counter: null as const };
};

const keyFromEnv = () =>
  crypto.createHash("sha256").update(normalizeTotpKey()).digest();

const seal = (plain: string) => {
  const key = keyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return base64url.encode(Buffer.concat([iv, enc, tag]));
};

const open = (token: string) => {
  const key = keyFromEnv();
  const buf = base64url.toBuffer(token);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
};

export class TotpService {
  private issuer = process.env.TOTP_ISSUER || "Technomoney";
  private pendingTtl = 900;
  private mem = new Map<string, string>();
  private memReplay = new Map<
    string,
    { counter: number; ts: number; expiresAt: number }
  >();

  private replayTtlSeconds(): number {
    const raw = Number(process.env.TOTP_REPLAY_TTL ?? "");
    if (!Number.isFinite(raw) || raw <= 0) {
      return 300;
    }
    return Math.max(60, Math.min(raw, 3600));
  }

  private log(bindings?: Record<string, unknown>) {
    return getLogger({
      svc: "TotpService",
      ...getLogContext(),
      ...(bindings || {}),
    });
  }

  private activeKey(userId: string) {
    return `mfa:totp:active:${userId}`;
  }

  private pendingKey(userId: string) {
    return `mfa:totp:pending:${userId}`;
  }

  private replayKey(userId: string) {
    return `mfa:totp:last:${userId}`;
  }

  private async readReplay(
    userId: string,
    r?: any
  ): Promise<{ counter: number; ts: number } | null> {
    const key = this.replayKey(userId);
    if (r) {
      const raw = (await r.get(key)) as string | null;
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed?.counter === "number" &&
          typeof parsed?.ts === "number"
        ) {
          return { counter: parsed.counter, ts: parsed.ts };
        }
      } catch {}
      return null;
    }
    const entry = this.memReplay.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memReplay.delete(key);
      return null;
    }
    return { counter: entry.counter, ts: entry.ts };
  }

  private async persistReplay(
    userId: string,
    value: { counter: number; ts: number },
    r?: any
  ) {
    const key = this.replayKey(userId);
    const ttl = this.replayTtlSeconds();
    if (r) {
      await r.setEx(key, ttl, JSON.stringify(value));
      return;
    }
    this.memReplay.set(key, {
      counter: value.counter,
      ts: value.ts,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async status(userId: string) {
    const r: any = await getRedis();
    if (r) {
      const v = (await r.get(this.activeKey(userId))) as string | null;
      return !!v;
    }
    return this.mem.has(this.activeKey(userId));
  }

  async setupStart(userId: string, label?: string) {
    const secretRaw = crypto.randomBytes(20);
    const secretB32 = base32Encode(secretRaw).replace(/=+$/g, "");
    const enc = seal(secretB32);
    const r: any = await getRedis();
    if (r) await r.setEx(this.pendingKey(userId), this.pendingTtl, enc);
    else this.mem.set(this.pendingKey(userId), enc);
    const account = encodeURIComponent(label || userId);
    const issuer = encodeURIComponent(this.issuer);
    const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secretB32}&issuer=${issuer}&algorithm=SHA1&digits=${digits}&period=${period}`;
    return { secret: secretB32, otpauth };
  }

  async setupVerify(userId: string, code: string) {
    const log = this.log({ userId: mask(userId) });
    const r: any = await getRedis();
    const kPending = this.pendingKey(userId);
    const enc =
      (r
        ? ((await r.get(kPending)) as string | null)
        : this.mem.get(kPending) ?? null) ?? "";
    if (!enc) return { enrolled: false };
    const b32 = open(enc);
    const check = verifyTotp(
      base32Decode(b32),
      code,
      Math.floor(Date.now() / 1000)
    );
    if (!check.ok) {
      log.warn({ evt: "mfa.enroll.fail" }, "mfa.enroll.fail");
      return { enrolled: false };
    }
    const act = seal(b32);
    const kActive = this.activeKey(userId);
    if (r) {
      await r.set(kActive, act);
      await r.del(kPending);
    } else {
      this.mem.set(kActive, act);
      this.mem.delete(kPending);
    }
    log.info({ evt: "mfa.enroll.success" }, "mfa.enroll.success");
    return { enrolled: true };
  }

  async challengeVerify(
    userId: string,
    code: string
  ): Promise<{ verified: boolean; reason?: "missing_secret" | "invalid" | "replay" }> {
    const log = this.log({ userId: mask(userId) });
    const r: any = await getRedis();
    const kActive = this.activeKey(userId);
    const enc =
      (r
        ? ((await r.get(kActive)) as string | null)
        : this.mem.get(kActive) ?? null) ?? "";
    if (!enc) {
      log.warn({ evt: "mfa.challenge.missing_secret" }, "mfa.challenge.fail");
      return { verified: false, reason: "missing_secret" as const };
    }
    const b32 = open(enc);
    const now = Math.floor(Date.now() / 1000);
    const check = verifyTotp(base32Decode(b32), code, now);
    if (!check.ok || check.counter === null) {
      log.warn({ evt: "mfa.challenge.invalid_code" }, "mfa.challenge.fail");
      return { verified: false, reason: "invalid" as const };
    }
    const last = await this.readReplay(userId, r);
    if (last && last.counter === check.counter) {
      log.warn(
        {
          evt: "mfa.challenge.replay",
          counter: check.counter,
          lastTs: last.ts,
        },
        "mfa.challenge.fail"
      );
      return { verified: false, reason: "replay" as const };
    }
    await this.persistReplay(userId, { counter: check.counter, ts: now }, r);
    log.info(
      { evt: "mfa.challenge.success", counter: check.counter },
      "mfa.challenge.success"
    );
    return { verified: true };
  }
}
