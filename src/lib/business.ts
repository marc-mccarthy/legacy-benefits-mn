import { getSiteSettings } from "@/lib/payload";
import { env } from "@/lib/env";

export type BusinessIdentity = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notificationEmails: string[];
};

/**
 * The single source of truth for who this business is.
 *
 * Reads from site settings so the client can change their own phone number or
 * address without a redeploy — these are content, not configuration. The env
 * vars remain only as a fallback for first boot, before anything is seeded.
 */
export async function getBusinessIdentity(): Promise<BusinessIdentity> {
  const settings = await getSiteSettings().catch(() => null);

  const notificationEmails = (
    settings?.leadNotificationEmails ||
    env("LEAD_NOTIFICATION_EMAILS") ||
    ""
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    // `||` rather than `??`: a blank CMS field should fall through too.
    name: settings?.businessName || env("BUSINESS_NAME") || "this agency",
    phone: settings?.contact?.phone || env("BUSINESS_PHONE") || undefined,
    email: settings?.contact?.email || undefined,
    address: settings?.contact?.address || undefined,
    notificationEmails,
  };
}
