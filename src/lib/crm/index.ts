import { env } from "@/lib/env";
import type { CrmTransport } from "./types";
import { MockTransport } from "./transports/mock";
import { WebhookTransport } from "./transports/webhook";
import { ZapierTransport } from "./transports/zapier";

export * from "./types";

let cached: CrmTransport | undefined;

const MODES = ["webhook", "zapier", "mock"] as const;

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

export function setCrmTransport(transport: CrmTransport | undefined) {
  cached = transport;
}
