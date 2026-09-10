import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmLead } from "../types";
import { ZapierTransport } from "./zapier";

const HOOK_URL = "https://hooks.zapier.com/hooks/catch/1234567/abcdef";
const KEY = "11111111-2222-3333-4444-555555555555";

const lead: CrmLead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0100",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me about my October enrollment.",
  sourcePath: "/contact",
};

function response(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => response(200));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function sentBody(): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

async function send(overrides: Partial<CrmLead> = {}) {
  return new ZapierTransport(HOOK_URL).send({ ...lead, ...overrides }, KEY);
}

describe("ZapierTransport.name", () => {
  it("identifies itself as the zapier transport", () => {
    expect(new ZapierTransport(HOOK_URL).name).toBe("zapier");
  });
});

describe("request shape", () => {
  it("POSTs JSON to the catch-hook URL", async () => {
    await send();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(HOOK_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends the lead unreshaped, unlike the webhook transport", async () => {
    // The Zap's "Add Lead" step does the field mapping, so this transport
    // passes the lead through as-is rather than renaming anything.
    await send();

    expect(sentBody()).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "612-555-0100",
      zip: "55101",
      interest: "medicare-advantage",
      message: "Please call me about my October enrollment.",
      sourcePath: "/contact",
    });
  });

  it("carries the idempotency key in the body, not a header", async () => {
    // A catch-hook does not surface request headers to the Zap, so the key
    // has to travel in the payload to be usable for de-duplication.
    await send();
    expect(sentBody().idempotency_key).toBe(KEY);
  });

  it("includes utm parameters as a nested object", async () => {
    await send({ utm: { utm_source: "google", utm_campaign: "aep-2026" } });

    expect(sentBody().utm).toEqual({
      utm_source: "google",
      utm_campaign: "aep-2026",
    });
  });

  it("omits absent optional fields", async () => {
    await send({ phone: undefined, zip: undefined });

    const body = sentBody();
    expect(body).not.toHaveProperty("phone");
    expect(body).not.toHaveProperty("zip");
  });
});

describe("result classification", () => {
  it("reports success and echoes the idempotency key", async () => {
    fetchMock.mockResolvedValueOnce(response(200));
    expect(await send()).toEqual({ ok: true, reference: KEY });
  });

  it("accepts any 2xx", async () => {
    fetchMock.mockResolvedValueOnce(response(204));
    expect(await send()).toMatchObject({ ok: true });
  });

  it.each([500, 502, 503])("retries a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(response(status));
    expect(await send()).toEqual({
      ok: false,
      error: `HTTP ${status}`,
      retryable: true,
    });
  });

  it.each([408, 429])("retries a %i despite it being a 4xx", async (status) => {
    fetchMock.mockResolvedValueOnce(response(status));
    expect(await send()).toMatchObject({ ok: false, retryable: true });
  });

  it.each([400, 401, 403, 404, 410])("gives up on a %i", async (status) => {
    // A dead or revoked catch-hook will fail identically forever; retrying it
    // just delays a human noticing.
    fetchMock.mockResolvedValueOnce(response(status));
    expect(await send()).toMatchObject({ ok: false, retryable: false });
  });

  it("reports only the status, since the body is not read", async () => {
    fetchMock.mockResolvedValueOnce(response(500));
    const result = await send();
    if (result.ok) throw new Error("expected a failure");
    expect(result.error).toBe("HTTP 500");
  });
});

describe("network failures", () => {
  it("retries when fetch rejects, surfacing the message", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    expect(await send()).toEqual({
      ok: false,
      error: "ECONNRESET",
      retryable: true,
    });
  });

  it("falls back to a generic message for a non-Error rejection", async () => {
    fetchMock.mockRejectedValueOnce("something threw a string");
    expect(await send()).toEqual({
      ok: false,
      error: "network error",
      retryable: true,
    });
  });
});

describe("timeout", () => {
  it("aborts once timeoutMs elapses", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("The operation was aborted.")),
          );
        }),
    );

    const pending = new ZapierTransport(HOOK_URL, 50).send(lead, KEY);
    await vi.advanceTimersByTimeAsync(50);

    expect(await pending).toEqual({
      ok: false,
      error: "The operation was aborted.",
      retryable: true,
    });
  });

  it("clears the timeout after a successful send", async () => {
    vi.useFakeTimers();

    await new ZapierTransport(HOOK_URL, 50).send(lead, KEY);

    // Nothing left pending that could abort a request already finished.
    expect(vi.getTimerCount()).toBe(0);
  });
});
