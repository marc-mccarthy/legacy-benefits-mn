import { headers } from "next/headers";

/**
 * The site's public origin.
 *
 * Prefers NEXT_PUBLIC_SITE_URL, but falls back to the incoming request's
 * forwarded host. That fallback is what lets the stack deploy without a custom
 * domain: the CloudFront URL is not known when the container's environment is
 * set, so the app works it out per request instead of being told.
 *
 * Only call this from a server component or route handler.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env["NEXT_PUBLIC_SITE_URL"];
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  // CloudFront and the ALB both set these; the first entry is the original.
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";

  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  return `${proto}://${host.split(",")[0].trim()}`;
}
