import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmLead } from "@/lib/crm/types";
import { WebhookTransport } from "@/lib/crm/transports/webhook";

const URL_UNDER_TEST = "https://crm.example.com/inbound/abc123";
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

function response(status: number, body = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => response(200, "ok"));
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
  const transport = new WebhookTransport(URL_UNDER_TEST);
  return transport.send({ ...lead, ...overrides }, KEY);
}

describe("WebhookTransport.name", () => {
  it("identifies itself as the webhook transport", () => {
    expect(new WebhookTransport(URL_UNDER_TEST).name).toBe("webhook");
  });
});

describe("payload mapping", () => {
  it("splits a two-part name into first and last", async () => {
    await send();
    expect(sentBody()).toMatchObject({
      first_name: "Jane",
      last_name: "Doe",
    });
  });

  it("omits last_name for a single-token name", async () => {
    await send({ name: "Cher" });
    const body = sentBody();
    expect(body.first_name).toBe("Cher");
    expect(body).not.toHaveProperty("last_name");
  });

  it("collapses runs of whitespace and keeps every middle name in last_name", async () => {
    await send({ name: "  Jane   Q  Doe  " });
    expect(sentBody()).toMatchObject({
      first_name: "Jane",
      last_name: "Q Doe",
    });
  });

  it("produces an empty first_name for a blank name", async () => {
    await send({ name: "   " });
    expect(sentBody().first_name).toBe("");
  });

  it("passes contact fields through unchanged", async () => {
    await send();
    expect(sentBody()).toMatchObject({
      email: "jane@example.com",
      phone: "612-555-0100",
      zip: "55101",
      source: "website",
      source_path: "/contact",
    });
  });

  it("joins interest and message into notes with a blank line", async () => {
    await send();
    expect(sentBody().notes).toBe(
      "Interest: medicare-advantage\n\nPlease call me about my October enrollment.",
    );
  });

  it("writes notes without a separator when only the message is present", async () => {
    await send({ interest: undefined });
    expect(sentBody().notes).toBe(
      "Please call me about my October enrollment.",
    );
  });

  it("writes notes without a separator when only the interest is present", async () => {
    await send({ message: undefined });
    expect(sentBody().notes).toBe("Interest: medicare-advantage");
  });

  it("writes empty notes when there is neither an interest nor a message", async () => {
    await send({ interest: undefined, message: undefined });
    expect(sentBody().notes).toBe("");
  });

  it("spreads utm parameters onto the top level of the payload", async () => {
    await send({
      utm: { utm_source: "google", utm_campaign: "aep-2026" },
    });
    expect(sentBody()).toMatchObject({
      utm_source: "google",
      utm_campaign: "aep-2026",
    });
  });
});

describe("request shape", () => {
  it("POSTs to the configured URL with the idempotency key as a header", async () => {
    await send();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_UNDER_TEST);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "Idempotency-Key": KEY,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("result classification", () => {
  it("reports success and echoes the idempotency key as the reference", async () => {
    fetchMock.mockResolvedValueOnce(response(201));
    expect(await send()).toEqual({ ok: true, reference: KEY });
  });

  it.each([500, 502, 503])("retries a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(response(status, "upstream down"));
    expect(await send()).toMatchObject({ ok: false, retryable: true });
  });

  it.each([408, 429])("retries a %i despite it being a 4xx", async (status) => {
    fetchMock.mockResolvedValueOnce(response(status, "slow down"));
    expect(await send()).toMatchObject({ ok: false, retryable: true });
  });

  it.each([400, 401, 403, 404, 422])("gives up on a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(response(status, "bad request"));
    expect(await send()).toMatchObject({ ok: false, retryable: false });
  });

  it("includes the status and response body in the error", async () => {
    fetchMock.mockResolvedValueOnce(response(422, "zip is required"));
    const result = await send();
    expect(result).toMatchObject({
      ok: false,
      error: "HTTP 422: zip is required",
    });
  });

  it("truncates a long response body to 200 characters", async () => {
    fetchMock.mockResolvedValueOnce(response(500, "x".repeat(500)));
    const result = await send();
    if (result.ok) throw new Error("expected a failure");
    expect(result.error).toBe(`HTTP 500: ${"x".repeat(200)}`);
  });
});

describe("network failures", () => {
  it("retries when fetch rejects, surfacing the error message", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    expect(await send()).toEqual({
      ok: false,
      error: "ECONNRESET",
      retryable: true,
    });
  });

  it("falls back to a generic message when the rejection is not an Error", async () => {
    fetchMock.mockRejectedValueOnce("something threw a string");
    expect(await send()).toEqual({
      ok: false,
      error: "network error",
      retryable: true,
    });
  });
});

describe("timeout", () => {
  it("aborts the request once timeoutMs elapses", async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("The operation was aborted.")),
          );
        }),
    );

    const transport = new WebhookTransport(URL_UNDER_TEST, 50);
    const pending = transport.send(lead, KEY);

    await vi.advanceTimersByTimeAsync(50);

    expect(await pending).toEqual({
      ok: false,
      error: "The operation was aborted.",
      retryable: true,
    });
  });

  it("clears the timeout after a successful send", async () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, "clearTimeout");

    await new WebhookTransport(URL_UNDER_TEST, 50).send(lead, KEY);

    expect(clear).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
