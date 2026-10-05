import { env } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  const configured = process.env["TURNSTILE_SECRET"];
  const secret = env("TURNSTILE_SECRET");

  if (secret === undefined && configured !== undefined && configured !== "") {
    throw new Error(
      "TURNSTILE_SECRET is set but contains only whitespace. Set it to a real secret key, or leave it empty to skip verification.",
    );
  }

  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
