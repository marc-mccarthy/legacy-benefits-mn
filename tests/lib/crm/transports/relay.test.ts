import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmLead } from "@/lib/crm/types";
import { RelayTransport } from "@/lib/crm/transports/relay";

const BASE_URL = "https://relay.example.com";
const SECRET = "relay-secret";
const KEY = "11111111-2222-3333-4444-555555555555";

const lead: CrmLead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0100",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me about my October enrollment.",
  sourcePath: "/contact",
  utm: { utm_source: "google" },
};

const OK_BODY = '{"ok":true,"indId":42,"outcome":"created"}';

function response(status: number, body = OK_BODY) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
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

function send(baseUrl = BASE_URL) {
  return new RelayTransport(baseUrl, SECRET).send(lead, KEY, 2);
}

describe("RelayTransport", () => {
  it("identifies itself as the relay transport", () => {
    expect(new RelayTransport(BASE_URL, SECRET).name).toBe("relay");
  });

  it("posts the relay contract with the secret and payload hash headers", async () => {
    await send();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/lead`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      authorization: `Bearer ${SECRET}`,
      "x-relay-secret": SECRET,
    });
    expect(JSON.parse(init.body as string)).toEqual({
      lead,
      idempotencyKey: KEY,
      attempt: 2,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends the hex SHA-256 of the exact body as x-amz-content-sha256", async () => {
    await send();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const expected = createHash("sha256")
      .update(init.body as string)
      .digest("hex");
    expect(init.headers).toMatchObject({ "x-amz-content-sha256": expected });
  });

  it("strips a trailing slash from the base url", async () => {
    await send(`${BASE_URL}///`);

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/lead`);
  });
});

describe("2xx replies", () => {
  it("returns the indId as reference on ok: true", async () => {
    expect(await send()).toEqual({ ok: true, reference: "42" });
  });

  it("still succeeds when ok: true carries no numeric indId", async () => {
    fetchMock.mockResolvedValueOnce(response(200, '{"ok":true}'));

    expect(await send()).toEqual({ ok: true });
  });

  it("treats 200 with ok:false as a non-retryable failure", async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, '{"ok":false,"retryable":true,"error":"no match"}'),
    );

    expect(await send()).toEqual({
      ok: false,
      error: "no match",
      retryable: false,
    });
  });

  it("treats invalid JSON on 2xx as a non-retryable failure", async () => {
    fetchMock.mockResolvedValueOnce(response(200, "<html>oops</html>"));

    expect(await send()).toMatchObject({ ok: false, retryable: false });
  });
});

describe("error statuses", () => {
  it.each([[500], [502], [408], [429]])("retries on %s", async (status) => {
    fetchMock.mockResolvedValueOnce(
      response(status, '{"ok":false,"retryable":true,"error":"upstream"}'),
    );

    expect(await send()).toMatchObject({ ok: false, retryable: true });
  });

  it.each([[400], [401], [422]])("gives up on %s", async (status) => {
    fetchMock.mockResolvedValueOnce(
      response(status, '{"ok":false,"retryable":false,"error":"rejected"}'),
    );

    expect(await send()).toMatchObject({ ok: false, retryable: false });
  });

  it("includes the status and a truncated body in the error", async () => {
    fetchMock.mockResolvedValueOnce(response(422, "x".repeat(500)));

    expect(await send()).toEqual({
      ok: false,
      error: `HTTP 422: ${"x".repeat(200)}`,
      retryable: false,
    });
  });
});

describe("network failures", () => {
  it("retries on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));

    expect(await send()).toEqual({
      ok: false,
      error: "ECONNRESET",
      retryable: true,
    });
  });

  it("aborts after the timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("The operation was aborted.")),
          );
        }),
    );

    const pending = new RelayTransport(BASE_URL, SECRET, 50).send(lead, KEY, 1);
    await vi.advanceTimersByTimeAsync(50);

    expect(await pending).toEqual({
      ok: false,
      error: "The operation was aborted.",
      retryable: true,
    });
  });
});
