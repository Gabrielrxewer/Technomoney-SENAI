import "dotenv/config";
import { request } from "https";
import { URLSearchParams } from "url";
import { logger } from "../utils/logger";

const normalizeHost = (h?: string) =>
  (h || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0]
    .trim();

export class RecaptchaService {
  verify(
    token: string,
    remoteip?: string,
    expectedAction?: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const secret = process.env.RECAPTCHA_SECRET?.trim() || "";
      if (!secret || !token) {
        logger.warn(
          { hasSecret: !!secret, hasToken: !!token },
          "recaptcha.verify.missing"
        );
        resolve(false);
        return;
      }
      const data = new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteip || "",
      }).toString();
      const req = request(
        {
          method: "POST",
          hostname: "www.google.com",
          path: "/recaptcha/api/siteverify",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              const raw = Buffer.concat(chunks).toString();
              const json = JSON.parse(raw);
              const min = Number(process.env.RECAPTCHA_MIN_SCORE || "0.7");
              const expected = (
                expectedAction?.trim() ||
                process.env.RECAPTCHA_EXPECTED_ACTION ||
                "login"
              ).trim();
              const isProd = process.env.NODE_ENV === "production";
              const expectedHost = normalizeHost(
                process.env.RECAPTCHA_HOSTNAME
              );
              const dataHost = normalizeHost(json.hostname);
              const hostOk =
                !isProd || !expectedHost || dataHost === expectedHost;
              const actionOk =
                !isProd || !json.action || json.action === expected;
              const scoreOk =
                typeof json.score === "number" ? json.score >= min : true;
              const ok = !!json.success && hostOk && actionOk && scoreOk;
              logger.debug(
                {
                  remoteip,
                  success: json.success,
                  score: json.score,
                  action: json.action,
                  expected,
                  challenge_ts: json.challenge_ts,
                  hostname: json.hostname,
                  checks: { hostOk, actionOk, scoreOk },
                },
                "recaptcha.verify.response"
              );
              resolve(ok);
            } catch (e) {
              logger.error({ e }, "recaptcha.verify.parse_error");
              reject(e);
            }
          });
        }
      );
      req.on("error", (err) => {
        logger.error({ err }, "recaptcha.verify.http_error");
        reject(err);
      });
      req.write(data);
      req.end();
    });
  }
}
