import { handleLeadBody } from "./lead";

export interface Env {
  RELAY_SECRET: string;
  MEDICAREPRO_API_TOKEN: string;
}

const BEARER_PREFIX = "Bearer ";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function digest(key: CryptoKey, value: string): Promise<Uint8Array> {
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return new Uint8Array(mac);
}

// HMAC with a throwaway key gives equal-length digests, so the compare leaks neither content nor length.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [da, db] = await Promise.all([digest(key, a), digest(key, b)]);
  let diff = da.length ^ db.length;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

async function isAuthorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const hasScheme = header.startsWith(BEARER_PREFIX);
  const token = hasScheme ? header.slice(BEARER_PREFIX.length) : "";
  const matches = await safeEqual(token, secret);
  return hasScheme && matches;
}

async function handleLead(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!env.RELAY_SECRET || !env.MEDICAREPRO_API_TOKEN) {
    return json({ error: "Relay not configured" }, 503);
  }
  if (!(await isAuthorized(request, env.RELAY_SECRET))) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body: unknown = await request.json().catch(() => undefined);
  const { status, body: reply } = await handleLeadBody(
    body,
    env.MEDICAREPRO_API_TOKEN,
  );
  return json(reply, status);
}

const relay = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/health" && request.method === "GET") {
      return json({ ok: true });
    }
    if (pathname === "/lead") return handleLead(request, env);
    return json({ error: "Not found" }, 404);
  },
};

export default relay;
