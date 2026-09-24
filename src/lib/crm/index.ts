import { env } from "@/lib/env";
import type { CrmTransport } from "./types";
import { MockTransport } from "./transports/mock";
import { WebhookTransport } from "./transports/webhook";
import { ZapierTransport } from "./transports/zapier";

export * from "./types";

let cached: CrmTransport | undefined;

/** Every value CRM_TRANSPORT is allowed to take. */
const MODES = ["webhook", "zapier", "mock"] as const;

/**
 * Chooses the transport from CRM_TRANSPORT. Unset defaults to the mock, so a
 * missing credential degrades to "leads are stored and queued" rather than a
 * crash — the lead itself is already safe in Postgres by the time this runs.
 *
 * An unrecognised value throws rather than falling back. The mock reports
 * every send as successful, so a typo like CRM_TRANSPORT=webook would have
 * drainOutbox mark each row `sent`, leave countFailed at zero, and never trip
 * the alarm, discarding every lead while reporting success. Read
 * through env() so a blank or padded value is treated as unset rather than as
 * an unknown mode.
 */
export function getCrmTransport(): CrmTransport {
  if (cached) return cached;

  const mode = env("CRM_TRANSPORT") ?? "mock";

  if (mode === "webhook") {
    const url = env("MEDICAREPRO_WEBHOOK_URL");
    if (!url)
      throw new Error(
        "CRM_TRANSPORT=webhook but MEDICAREPRO_WEBHOOK_URL is not set",
      );
    cached = new WebhookTransport(url);
  } else if (mode === "zapier") {
    const url = env("MEDICAREPRO_ZAPIER_HOOK_URL");
    if (!url)
      throw new Error(
        "CRM_TRANSPORT=zapier but MEDICAREPRO_ZAPIER_HOOK_URL is not set",
      );
    cached = new ZapierTransport(url);
  } else if (mode === "mock") {
    cached = new MockTransport();
  } else {
    throw new Error(
      `CRM_TRANSPORT="${mode}" is not a known transport. Expected one of: ${MODES.join(", ")}.`,
    );
  }

  return cached;
}

/** Test seam: lets a spec install a transport without touching env. */
export function setCrmTransport(transport: CrmTransport | undefined) {
  cached = transport;
}
