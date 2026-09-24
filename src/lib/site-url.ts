import { env } from "@/lib/env";

/**
 * The site's public origin, with any trailing slash stripped.
 *
 * Read at build time: a static export has no request to infer a host from, so
 * `NEXT_PUBLIC_SITE_URL` is the only source. `https://example.invalid` is the
 * placeholder when it is unset — reserved by RFC 6761 and never resolvable, so
 * a missing variable shows up as a broken absolute URL rather than as a
 * localhost origin baked into the shipped JSON-LD.
 */
export function getSiteUrl(): string {
  const configured = env("NEXT_PUBLIC_SITE_URL");
  if (!configured) return "https://example.invalid";
  return configured.replace(/\/+$/, "");
}
