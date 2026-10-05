import { env } from "@/lib/env";

export function getSiteUrl(): string {
  const configured = env("NEXT_PUBLIC_SITE_URL");
  if (!configured) return "https://example.invalid";
  return configured.replace(/\/+$/, "");
}
