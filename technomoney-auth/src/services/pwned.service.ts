import { request } from "https";
import { createHash } from "crypto";

export class PwnedService {
  count(pwd: string): Promise<number> {
    const sha = createHash("sha1").update(pwd).digest("hex").toUpperCase();
    const prefix = sha.slice(0, 5);
    const suffix = sha.slice(5);
    return new Promise((resolve, reject) => {
      const req = request(
        {
          method: "GET",
          host: "api.pwnedpasswords.com",
          path: `/range/${prefix}`,
          headers: { "Add-Padding": "true" },
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c.toString("utf8")));
          res.on("end", () => {
            const line = data
              .split("\n")
              .find((l) => l.startsWith(suffix + ":"));
            if (!line) return resolve(0);
            const n = parseInt(line.split(":")[1].trim(), 10);
            resolve(Number.isFinite(n) ? n : 0);
          });
        }
      );
      req.on("error", reject);
      req.end();
    });
  }
}
