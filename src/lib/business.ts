import { env } from "@/lib/env";

export type BusinessIdentity = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notificationEmails: string[];
};

/**
 * The environment is the only source. There is no fallback: a missing
 * `BUSINESS_NAME` throws at build time rather than rendering a stale value that
 * looks deliberate, which is how the wrong trading name reached a deployed page
 * once already.
 */
export async function getBusinessIdentity(): Promise<BusinessIdentity> {
  const name = env("BUSINESS_NAME");
  if (!name) {
    throw new Error(
      "BUSINESS_NAME is not set. It is required at build time and at API runtime.",
    );
  }

  const notificationEmails = (env("LEAD_NOTIFICATION_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    name,
    phone: env("BUSINESS_PHONE"),
    email: env("BUSINESS_EMAIL"),
    address: env("BUSINESS_ADDRESS"),
    notificationEmails,
  };
}
