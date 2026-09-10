import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordDncRequest, verifyTurnstile } = vi.hoisted(() => ({
  recordDncRequest: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/compliance/dnc", () => ({ recordDncRequest }));
// Mocked only so the spec can assert this route never calls it.
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile }));

// dncInputSchema and clientIp run for real.
const { POST } = await import("./route");

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
    // The refine reports on `email` so the form has somewhere to show it.
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

    // Deliberate: under TCPA a revocation must be honoured through any
    // reasonable means, so adding friction to a stop request is itself the
    // risk. The cost of a spurious suppression is one lost lead; the cost of
    // a blocked one is a claim.
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
  // REGRESSION GUARD.
  //
  // phone had a maximum but no minimum, so "12345" satisfied the "email or
  // phone" rule, reached recordDncRequest, and was discarded by normalizePhone
  // as under ten digits. The row landed with no identifier — suppressing
  // nobody — while this route answered 201 and told the visitor their opt-out
  // was recorded. A 422 they can act on is the correct answer.
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
    // The rule is unconditional by choice. Accepting the request and
    // suppressing only the email would honour half of what the visitor asked
    // for and leave their phone contactable, without telling them.
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
    // Blank is still the way to say "I only have an email" — the stricter
    // field must not force a phone number into an email-only request.
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
