import { env } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token. With no secret configured (local dev)
 * verification is skipped rather than failing closed, so the form is testable
 * without Cloudflare credentials.
 *
 * A secret that is present but whitespace-only throws instead of falling into
 * either default. Silently skipping would turn bot protection off in
 * production without anyone asking for it, and silently verifying against a
 * blank secret makes Cloudflare reject every visitor — a site-wide 403 on the
 * contact form that reads like Cloudflare being flaky. Neither is a state
 * anyone chose, so it fails loudly and diagnosably instead.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  const configured = process.env["TURNSTILE_SECRET"];
  // env() trims, so a real key pasted with a trailing newline still works.
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
