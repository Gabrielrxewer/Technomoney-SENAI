import type { IntrospectionSuccess } from "../types/introspection";

export class JwtVerifierService {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async verifyAccess(token: string): Promise<IntrospectionSuccess> {
    const url = process.env.AUTH_INTROSPECTION_URL;
    if (!url) {
      throw new Error("AUTH_INTROSPECTION_URL is not configured");
    }

    const clientId = process.env.AUTH_INTROSPECTION_CLIENT_ID || "";
    const clientSecret = process.env.AUTH_INTROSPECTION_CLIENT_SECRET || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (clientId && clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }

    const body = new URLSearchParams({
      token,
      token_type_hint: "access_token",
    });

    const res = await this.fetchFn(url, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      throw new Error(`introspection request failed with status ${res.status}`);
    }

    return (await res.json()) as IntrospectionSuccess;
  }
}
