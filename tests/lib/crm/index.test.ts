import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { constructed, RelayTransport, MockTransport } = vi.hoisted(() => {
  const constructed: Array<{ kind: string; args: unknown[] }> = [];

  class RelayTransport {
    readonly name = "relay";
    constructor(...args: unknown[]) {
      constructed.push({ kind: "relay", args });
    }
  }
  class MockTransport {
    readonly name = "mock";
    constructor(...args: unknown[]) {
      constructed.push({ kind: "mock", args });
    }
  }

  return { constructed, RelayTransport, MockTransport };
});

vi.mock("@/lib/crm/transports/relay", () => ({ RelayTransport }));
vi.mock("@/lib/crm/transports/mock", () => ({ MockTransport }));

const RELAY_URL = "https://relay.example.com";
const RELAY_SECRET = "relay-secret";

async function load() {
  vi.resetModules();
  constructed.length = 0;
  return import("@/lib/crm/index");
}

beforeEach(() => {
  vi.stubEnv("CRM_TRANSPORT", undefined);
  vi.stubEnv("CRM_RELAY_URL", undefined);
  vi.stubEnv("CRM_RELAY_SECRET", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("relay mode", () => {
  it("builds the relay transport from the configured URL and secret", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("relay");
    expect(constructed).toEqual([
      { kind: "relay", args: [RELAY_URL, RELAY_SECRET] },
    ]);
  });

  it("refuses to start without the URL", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      "CRM_TRANSPORT=relay but CRM_RELAY_URL is not set",
    );
  });

  it("refuses to start without the secret", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      "CRM_TRANSPORT=relay but CRM_RELAY_SECRET is not set",
    );
  });

  it("treats blank values as missing", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", "");
    vi.stubEnv("CRM_RELAY_SECRET", "   ");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("CRM_RELAY_URL is not set");

    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    expect(() => getCrmTransport()).toThrow("CRM_RELAY_SECRET is not set");
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
    ["a typo", "relai"],
    ["the wrong case", "Relay"],
    ["an unrelated value", "salesforce"],
  ])("%s throws rather than silently discarding leads", async (_l, value) => {
    vi.stubEnv("CRM_TRANSPORT", value);
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow(
      `CRM_TRANSPORT="${value}" is not a known transport`,
    );
  });

  it("names the accepted values in the error", async () => {
    vi.stubEnv("CRM_TRANSPORT", "salesforce");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow("Expected one of: relay, mock.");
  });

  it("never builds a transport it could not identify", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relai");
    const { getCrmTransport } = await load();

    expect(() => getCrmTransport()).toThrow();
    expect(constructed).toHaveLength(0);
  });
});

describe("padded and blank configuration", () => {
  it("tolerates surrounding whitespace on a real mode", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay\n");
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("relay");
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

  it("trims a padded URL and secret", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", ` ${RELAY_URL}\n`);
    vi.stubEnv("CRM_RELAY_SECRET", ` ${RELAY_SECRET}\n`);
    const { getCrmTransport } = await load();

    expect(getCrmTransport().name).toBe("relay");
    expect(constructed).toEqual([
      { kind: "relay", args: [RELAY_URL, RELAY_SECRET] },
    ]);
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

    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);

    expect(getCrmTransport().name).toBe("mock");
  });

  it("does not cache a failed resolution", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
    const { getCrmTransport } = await load();
    expect(() => getCrmTransport()).toThrow();

    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);

    expect(getCrmTransport().name).toBe("relay");
  });
});

describe("setCrmTransport", () => {
  it("installs a transport without touching the environment", async () => {
    vi.stubEnv("CRM_TRANSPORT", "relay");
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

    vi.stubEnv("CRM_TRANSPORT", "relay");
    vi.stubEnv("CRM_RELAY_URL", RELAY_URL);
    vi.stubEnv("CRM_RELAY_SECRET", RELAY_SECRET);

    expect(getCrmTransport().name).toBe("relay");
  });
});
