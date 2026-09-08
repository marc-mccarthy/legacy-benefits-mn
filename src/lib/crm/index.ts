import type { CrmTransport } from "./types";
import { MockTransport } from "./transports/mock";
import { WebhookTransport } from "./transports/webhook";
import { ZapierTransport } from "./transports/zapier";

export * from "./types";

let cached: CrmTransport | undefined;

/**
 * Chooses the transport from CRM_TRANSPORT. Defaults to the mock so a missing
 * credential degrades to "leads are stored and queued" rather than a crash —
 * the lead itself is already safe in Postgres by the time this runs.
 */
export function getCrmTransport(): CrmTransport {
  if (cached) return cached;

  const mode = process.env["CRM_TRANSPORT"] ?? "mock";

  if (mode === "webhook") {
    const url = process.env["MEDICAREPRO_WEBHOOK_URL"];
    if (!url)
      throw new Error(
        "CRM_TRANSPORT=webhook but MEDICAREPRO_WEBHOOK_URL is not set",
      );
    cached = new WebhookTransport(url);
  } else if (mode === "zapier") {
    const url = process.env["MEDICAREPRO_ZAPIER_HOOK_URL"];
    if (!url)
      throw new Error(
        "CRM_TRANSPORT=zapier but MEDICAREPRO_ZAPIER_HOOK_URL is not set",
      );
    cached = new ZapierTransport(url);
  } else {
    cached = new MockTransport();
  }

  return cached;
}

/** Test seam: lets a spec install a transport without touching env. */
export function setCrmTransport(transport: CrmTransport | undefined) {
  cached = transport;
}
