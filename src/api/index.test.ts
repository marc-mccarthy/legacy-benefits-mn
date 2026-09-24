import { beforeEach, describe, expect, it, vi } from "vitest";

const { leads, soa, dnc, outbox, health } = vi.hoisted(() => ({
  leads: vi.fn(),
  soa: vi.fn(),
  dnc: vi.fn(),
  outbox: vi.fn(),
  health: vi.fn(),
}));

vi.mock("./leads", () => ({ POST: leads }));
vi.mock("./soa", () => ({ POST: soa }));
vi.mock("./do-not-contact", () => ({ POST: dnc }));
vi.mock("./jobs-outbox", () => ({ POST: outbox }));
vi.mock("./health", () => ({ GET: health }));

const { handler, toRequest } = await import("./index");

function event(
  method: string,
  path: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    rawPath: path,
    rawQueryString: "",
    headers: { host: "api.example", "content-type": "application/json" },
    requestContext: { http: { method, path } },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of [leads, soa, dnc, outbox, health]) {
    fn.mockReset().mockResolvedValue(Response.json({ ok: true }));
  }
});

describe("dispatch", () => {
  it.each([
    ["POST", "/api/leads", () => leads],
    ["POST", "/api/soa", () => soa],
    ["POST", "/api/do-not-contact", () => dnc],
    ["POST", "/api/jobs/outbox", () => outbox],
    ["GET", "/api/health", () => health],
  ])("routes %s %s to its handler", async (method, path, target) => {
    const result = await handler(event(method, path));

    expect(target()).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(200);
  });

  it("passes a standard Request to the handler", async () => {
    await handler(event("POST", "/api/leads", { body: '{"name":"a"}' }));

    const [req] = leads.mock.calls[0] as [Request];
    expect(req).toBeInstanceOf(Request);
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/leads");
    await expect(req.text()).resolves.toBe('{"name":"a"}');
  });

  it("calls no other handler", async () => {
    await handler(event("POST", "/api/leads"));

    for (const fn of [soa, dnc, outbox, health]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("tolerates a trailing slash", async () => {
    await handler(event("GET", "/api/health/"));
    expect(health).toHaveBeenCalledTimes(1);
  });
});

describe("the 404 contract", () => {
  it.each([
    ["GET", "/"],
    ["GET", "/api"],
    ["GET", "/api/unknown"],
    ["POST", "/api/media/file/x.jpg"],
    ["GET", "/admin"],
    ["POST", "/api/leads/extra"],
  ])("answers %s %s with 404", async (method, path) => {
    const result = await handler(event(method, path));

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe('{"error":"Not found"}');
  });

  it("404s a known path on the wrong method", async () => {
    const result = await handler(event("GET", "/api/leads"));

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe('{"error":"Not found"}');
    expect(leads).not.toHaveBeenCalled();
  });

  it("reaches no handler at all on an unlisted path", async () => {
    await handler(event("POST", "/api/anything"));

    for (const fn of [leads, soa, dnc, outbox, health]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("the response shape", () => {
  it("carries status, headers and body through unchanged", async () => {
    leads.mockResolvedValueOnce(
      Response.json(
        { ok: true, leadId: "abc", suppressed: false },
        { status: 201 },
      ),
    );

    const result = await handler(event("POST", "/api/leads"));

    expect(result.statusCode).toBe(201);
    expect(result.headers["content-type"]).toContain("application/json");
    expect(JSON.parse(result.body)).toEqual({
      ok: true,
      leadId: "abc",
      suppressed: false,
    });
    expect(result.isBase64Encoded).toBe(false);
  });

  it("preserves a 403 from the handler", async () => {
    leads.mockResolvedValueOnce(
      Response.json(
        { error: "Could not verify that you are human. Please try again." },
        { status: 403 },
      ),
    );

    const result = await handler(event("POST", "/api/leads"));

    expect(result.statusCode).toBe(403);
  });
});

describe("toRequest", () => {
  it("decodes a base64 body", async () => {
    const req = toRequest(
      event("POST", "/api/leads", {
        body: Buffer.from('{"a":1}').toString("base64"),
        isBase64Encoded: true,
      }),
    );

    await expect(req.text()).resolves.toBe('{"a":1}');
  });

  it("keeps the query string", () => {
    const req = toRequest(
      event("GET", "/api/health", { rawQueryString: "deep=1" }),
    );
    expect(new URL(req.url).search).toBe("?deep=1");
  });

  it("carries the forwarding headers clientIp reads", () => {
    const req = toRequest(
      event("POST", "/api/leads", {
        headers: {
          host: "api.example",
          "x-forwarded-for": "203.0.113.9, 70.0.0.1",
        },
      }),
    );

    expect(req.headers.get("x-forwarded-for")).toBe("203.0.113.9, 70.0.0.1");
  });

  it("sends no body on GET", () => {
    const req = toRequest(event("GET", "/api/health", { body: "ignored" }));
    expect(req.body).toBeNull();
  });
});
