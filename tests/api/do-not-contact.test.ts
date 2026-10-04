import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordDncRequest, verifyTurnstile } = vi.hoisted(() => ({
  recordDncRequest: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/compliance/dnc", () => ({ recordDncRequest }));
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile }));

const { POST } = await import("@/api/do-not-contact");

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://agency.example/api/do-not-contact", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recordDncRequest.mockReset().mockResolvedValue({ id: 3 });
  verifyTurnstile.mockReset().mockResolvedValue(true);
});

describe("bad requests", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(post("not json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("requires a known request type", async () => {
    const res = await POST(
      post({
        email: "jane@example.com",
        requestType: "unsubscribe-everything",
      }),
    );

    expect(res.status).toBe(422);
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("requires a request type at all", async () => {
    const res = await POST(post({ email: "jane@example.com" }));

    expect(res.status).toBe(422);
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const res = await POST(
      post({ email: "not-an-email", requestType: "revoke-contact" }),
    );

    expect(res.status).toBe(422);
  });
});

describe("something to suppress is required", () => {
  it("rejects a request naming neither an email nor a phone", async () => {
    const res = await POST(post({ requestType: "revoke-contact" }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.issues.email).toBeTruthy();
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only identifiers", async () => {
    const res = await POST(
      post({ email: "   ", phone: "   ", requestType: "revoke-contact" }),
    );

    expect(res.status).toBe(422);
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("accepts an email alone", async () => {
    const res = await POST(
      post({ email: "jane@example.com", requestType: "revoke-contact" }),
    );
    expect(res.status).toBe(201);
  });

  it("accepts a phone alone", async () => {
    const res = await POST(
      post({ phone: "612-555-0199", requestType: "revoke-contact" }),
    );
    expect(res.status).toBe(201);
  });
});

describe("recording the opt-out", () => {
  const valid = {
    email: "jane@example.com",
    phone: "612-555-0199",
    requestType: "revoke-contact",
    notes: "Please stop calling.",
  };

  it("returns 201 with the new record id", async () => {
    const res = await POST(post(valid));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true, id: 3 });
  });

  it.each(["revoke-contact", "do-not-sell", "delete-my-data"])(
    "accepts a %s request",
    async (requestType) => {
      const res = await POST(post({ ...valid, requestType }));

      expect(res.status).toBe(201);
      expect(recordDncRequest.mock.calls[0][0].requestType).toBe(requestType);
    },
  );

  it("passes the validated input and the client IP", async () => {
    await POST(post(valid, { "x-forwarded-for": "203.0.113.5, 70.41.3.18" }));

    expect(recordDncRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "jane@example.com",
        phone: "612-555-0199",
        requestType: "revoke-contact",
      }),
      { ip: "203.0.113.5" },
    );
  });

  it("leaves the IP undefined when the header is absent", async () => {
    await POST(post(valid));
    expect(recordDncRequest.mock.calls[0][1]).toEqual({ ip: undefined });
  });
});

describe("no bot check, by design", () => {
  it("never calls turnstile", async () => {
    await POST(
      post({ email: "jane@example.com", requestType: "revoke-contact" }),
    );

    expect(verifyTurnstile).not.toHaveBeenCalled();
  });

  it("records an opt-out with no token supplied", async () => {
    const res = await POST(
      post({ email: "jane@example.com", requestType: "revoke-contact" }),
    );

    expect(res.status).toBe(201);
    expect(recordDncRequest).toHaveBeenCalled();
  });
});

describe("a phone too short to suppress anything", () => {
  it.each(["12345", "612555019", "not a phone"])(
    "is rejected with a 422 for %j",
    async (phone) => {
      const res = await POST(post({ phone, requestType: "revoke-contact" }));

      expect(res.status).toBe(422);
      expect(recordDncRequest).not.toHaveBeenCalled();
    },
  );

  it("tells the visitor what is wrong with it", async () => {
    const res = await POST(
      post({ phone: "12345", requestType: "revoke-contact" }),
    );

    const body = await res.json();
    expect(String(body.issues.phone)).toContain("at least 10 digits");
  });

  it.each(["6125550199", "612-555-0199", "(612) 555-0199", "+1 612-555-0199"])(
    "still accepts a usable number written as %j",
    async (phone) => {
      const res = await POST(post({ phone, requestType: "revoke-contact" }));
      expect(res.status).toBe(201);
    },
  );

  it("is still rejected when a valid email accompanies it", async () => {
    const res = await POST(
      post({
        email: "jane@example.com",
        phone: "12345",
        requestType: "revoke-contact",
      }),
    );

    expect(res.status).toBe(422);
    expect(recordDncRequest).not.toHaveBeenCalled();
  });

  it("accepts an email-only opt-out with the phone left blank", async () => {
    const res = await POST(
      post({
        email: "jane@example.com",
        phone: "",
        requestType: "revoke-contact",
      }),
    );

    expect(res.status).toBe(201);
  });
});
