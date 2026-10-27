import { env } from "@/lib/env";
import type { CrmTransport } from "./types";
import { MockTransport } from "./transports/mock";
import { RelayTransport } from "./transports/relay";

export * from "./types";

let cached: CrmTransport | undefined;

const MODES = ["relay", "mock"] as const;

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`CRM_TRANSPORT=relay but ${name} is not set`);
  return value;
}

export function getCrmTransport(): CrmTransport {
  if (cached) return cached;

  const mode = env("CRM_TRANSPORT") ?? "mock";

  if (mode === "relay") {
    cached = new RelayTransport(
      requireEnv("CRM_RELAY_URL"),
      requireEnv("CRM_RELAY_SECRET"),
    );
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
