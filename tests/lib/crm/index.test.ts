import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { constructed, WebhookTransport, ZapierTransport, MockTransport } =
  vi.hoisted(() => {
    const constructed: Array<{ kind: string; args: unknown[] }> = [];

    class WebhookTransport {
      readonly name = "webhook";
      constructor(...args: unknown[]) {
        constructed.push({ kind: "webhook", args });
      }
    }
    class ZapierTransport {
      readonly name = "zapier";
      constructor(...args: unknown[]) {
        constructed.push({ kind: "zapier", args });
      }
    }
    class MockTransport {
      readonly name = "mock";
      constructor(...args: unknown[]) {
        constructed.push({ kind: "mock", args });
      }
    }

    return { constructed, WebhookTransport, ZapierTransport, MockTransport };
  });

vi.mock("@/lib/crm/transports/webhook", () => ({ WebhookTransport }));
vi.mock("@/lib/crm/transports/zapier", () => ({ ZapierTransport }));
vi.mock("@/lib/crm/transports/mock", () => ({ MockTransport }));

const WEBHOOK_URL = "https://crm.example.com/inbound/abc123";
const ZAPIER_URL = "https://hooks.zapier.com/hooks/catch/1/xyz";

async function load() {
  vi.resetModules();
  constructed.length = 0;
  return import("@/lib/crm/index");
}

beforeEach(() => {
  vi.stubEnv("CRM_TRANSPORT", undefined);
  vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", undefined);
  vi.stubEnv("MEDICAREPRO_ZAPIER_HOOK_URL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("webhook mode", () => {
  it("builds the webhook transport from the configured URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("webhook");
    expect(constructed).toEqual([{ kind: "webhook", args: [WEBHOOK_URL] }]);
  });

  it("refuses to start without the URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      "CRM_TRANSPORT=webhook but MEDICAREPRO_WEBHOOK_URL is not set",
    );
  });

  it("treats a blank URL as missing", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", "");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("is not set");
  });
});

describe("zapier mode", () => {
  it("builds the zapier transport from the configured hook URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "zapier");
    vi.stubEnv("MEDICAREPRO_ZAPIER_HOOK_URL", ZAPIER_URL);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("zapier");
    expect(constructed).toEqual([{ kind: "zapier", args: [ZAPIER_URL] }]);
  });

  it("refuses to start without the hook URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "zapier");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      "CRM_TRANSPORT=zapier but MEDICAREPRO_ZAPIER_HOOK_URL is not set",
    );
  });

  it("treats a blank hook URL as missing", async () => {
    vi.stubEnv("CRM_TRANSPORT", "zapier");
    vi.stubEnv("MEDICAREPRO_ZAPIER_HOOK_URL", "");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("is not set");
  });

  it("ignores the webhook URL when zapier is selected", async () => {
    vi.stubEnv("CRM_TRANSPORT", "zapier");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("MEDICAREPRO_ZAPIER_HOOK_URL");
  });
});

describe("mock mode", () => {
  it("defaults to the mock when nothing is configured", async () => {
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("mock");
    expect(constructed).toEqual([{ kind: "mock", args: [] }]);
  });

  it("selects the mock explicitly", async () => {
    vi.stubEnv("CRM_TRANSPORT", "mock");
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("mock");
  });
});

describe("unrecognised configuration", () => {
  it.each([
    ["a typo", "webook"],
    ["the wrong case", "Webhook"],
    ["an unrelated value", "salesforce"],
  ])("%s throws rather than silently discarding leads", async (_l, value) => {
    vi.stubEnv("CRM_TRANSPORT", value);
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      `CRM_TRANSPORT="${value}" is not a known transport`,
    );
  });

  it("names the accepted values in the error", async () => {
    vi.stubEnv("CRM_TRANSPORT", "salesforce");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      "Expected one of: webhook, zapier, mock.",
    );
  });

  it("never builds a transport it could not identify", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webook");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow();
    expect(constructed).toHaveLength(0);
  });
});

describe("padded and blank configuration", () => {
  it("tolerates surrounding whitespace on a real mode", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook\n");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("webhook");
  });

  it("treats a blank CRM_TRANSPORT as unset, not as an unknown mode", async () => {
    vi.stubEnv("CRM_TRANSPORT", "");
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("mock");
  });

  it("treats a whitespace-only CRM_TRANSPORT as unset", async () => {
    vi.stubEnv("CRM_TRANSPORT", "   ");
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("mock");
  });

  it("trims a padded webhook URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", ` ${WEBHOOK_URL}\n`);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("webhook");
    expect(constructed).toEqual([{ kind: "webhook", args: [WEBHOOK_URL] }]);
  });

  it("treats a whitespace-only webhook URL as missing", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", "   ");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("is not set");
  });
});

describe("memoisation", () => {
  it("returns the same instance on repeated calls", async () => {
    const { getCrmTransport } = await load();

    expect(getCrmTransport()).toBe(getCrmTransport());
    expect(constructed).toHaveLength(1);
  });

  it("ignores an environment change after the first resolution", async () => {
    const { getCrmTransport } = await load();
    expect(getCrmTransport().name).toBe("mock");

    vi.stubEnv("CRM_TRANSPORT", "webhook");
    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);

    expect(getCrmTransport().name).toBe("mock");
  });

  it("does not cache a failed resolution", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    const { getCrmTransport } = await load();
    expect(() => getCrmTransport()).toThrow();

    vi.stubEnv("MEDICAREPRO_WEBHOOK_URL", WEBHOOK_URL);

    expect(getCrmTransport().name).toBe("webhook");
  });
});

describe("setCrmTransport", () => {
  it("installs a transport without touching the environment", async () => {
    vi.stubEnv("CRM_TRANSPORT", "webhook");
    const { getCrmTransport, setCrmTransport } = await load();
    const stub = { name: "stub", send: vi.fn() };

    setCrmTransport(stub);

    expect(getCrmTransport()).toBe(stub);
    expect(constructed).toHaveLength(0);
  });

  it("replaces an already-resolved transport", async () => {
    const { getCrmTransport, setCrmTransport } = await load();
    expect(getCrmTransport().name).toBe("mock");

    const stub = { name: "stub", send: vi.fn() };
    setCrmTransport(stub);

    expect(getCrmTransport()).toBe(stub);
  });

  it("clears the cache when passed undefined", async () => {
    const { getCrmTransport, setCrmTransport } = await load();
    setCrmTransport({ name: "stub", send: vi.fn() });

    setCrmTransport(undefined);

    expect(getCrmTransport().name).toBe("mock");
  });

  it("re-resolves from the environment after being cleared", async () => {
    const { getCrmTransport, setCrmTransport } = await load();
    setCrmTransport(undefined);

    vi.stubEnv("CRM_TRANSPORT", "zapier");
    vi.stubEnv("MEDICAREPRO_ZAPIER_HOOK_URL", ZAPIER_URL);

    expect(getCrmTransport().name).toBe("zapier");
  });
});
