export type Client = {
  client_id: string;
  redirect_uris: string[];
  require_par?: boolean;
};

let cache: Client[] | null = null;

function isClient(x: any): x is Client {
  return x && typeof x.client_id === "string" && Array.isArray(x.redirect_uris);
}

function load(): Client[] {
  if (cache) return cache;
  const raw = process.env.OIDC_CLIENTS || "[]";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cache = parsed.filter(isClient);
      return cache;
    }
  } catch {}
  cache = [];
  return cache;
}

export function getClient(client_id: string): Client | undefined {
  return load().find((c) => c.client_id === client_id);
}

export function isRedirectUriAllowed(
  client: Client,
  redirect_uri: string
): boolean {
  try {
    const ru = new URL(redirect_uri);
    return client.redirect_uris.some((u) => {
      try {
        const a = new URL(u);
        return (
          a.protocol === ru.protocol &&
          a.host === ru.host &&
          a.pathname === ru.pathname
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
