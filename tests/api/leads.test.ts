import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureLead, verifyTurnstile, getBusinessIdentity, notify, confirm } =
  vi.hoisted(() => ({
    captureLead: vi.fn(),
    verifyTurnstile: vi.fn(),
    getBusinessIdentity: vi.fn(),
    notify: vi.fn(),
    confirm: vi.fn(),
  }));

vi.mock("@/lib/leads/service", () => ({ captureLead }));
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile }));
vi.mock("@/lib/business", () => ({ getBusinessIdentity }));
vi.mock("@/lib/email", () => ({
  sendLeadNotification: notify,
  sendLeadConfirmation: confirm,
}));

const { POST } = await import("@/api/leads");

const business = {
  name: "Acme Medicare",
  phone: "612-555-0100",
  notificationEmails: ["agent@acme.example"],
};

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0199",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me.",
  sourcePath: "/contact",
  consent: true,
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://agency.example/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  captureLead.mockReset().mockResolvedValue({ leadId: 42, suppressed: false });
  verifyTurnstile.mockReset().mockResolvedValue(true);
  getBusinessIdentity.mockReset().mockResolvedValue(business);
  notify.mockReset().mockResolvedValue({ sent: true });
  confirm.mockReset().mockResolvedValue({ sent: true });
});

describe("bad requests", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(post("not json at all"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(captureLead).not.toHaveBeenCalled();
  });

  it("returns field-level issues for a failed validation", async () => {
    const res = await POST(post({ ...valid, consent: false }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues.consent).toBeTruthy();
    expect(captureLead).not.toHaveBeenCalled();
  });

  it("never captures a lead with a malformed email", async () => {
    const res = await POST(post({ ...valid, email: "nope" }));

    expect(res.status).toBe(422);
    expect(captureLead).not.toHaveBeenCalled();
  });
});

describe("honeypot", () => {
  it("accepts a filled honeypot with 202 and drops the submission", async () => {
    const res = await POST(post({ ...valid, company: "spam corp" }));

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("does not store, verify or email a honeypot hit", async () => {
    await POST(post({ ...valid, company: "spam corp" }));

    expect(captureLead).not.toHaveBeenCalled();
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("treats an empty honeypot as a real submission", async () => {
    const res = await POST(post({ ...valid, company: "" }));

    expect(res.status).toBe(201);
    expect(captureLead).toHaveBeenCalled();
  });
});

describe("turnstile", () => {
  it("refuses the submission when verification fails", async () => {
    verifyTurnstile.mockResolvedValueOnce(false);

    const res = await POST(post(valid));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Could not verify that you are human. Please try again.",
    });
  });

  it("does not store a lead that failed verification", async () => {
    verifyTurnstile.mockResolvedValueOnce(false);

    await POST(post(valid));

    expect(captureLead).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("passes the token and client IP to verification", async () => {
    await POST(
      post(
        { ...valid, turnstileToken: "tok-123" },
        { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
      ),
    );

    expect(verifyTurnstile).toHaveBeenCalledWith("tok-123", "203.0.113.5");
  });
});

describe("successful capture", () => {
  it("returns 201 with the new lead id", async () => {
    const res = await POST(post(valid));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      leadId: 42,
      suppressed: false,
    });
  });

  it("hands the validated input and request metadata to the service", async () => {
    await POST(
      post(valid, {
        "x-forwarded-for": "203.0.113.5",
        "user-agent": "Mozilla/5.0",
      }),
    );

    expect(captureLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane Doe", email: "jane@example.com" }),
      { ip: "203.0.113.5", userAgent: "Mozilla/5.0", business },
    );
  });

  it("takes only the first hop of x-forwarded-for as the client", async () => {
    await POST(
      post(valid, { "x-forwarded-for": " 203.0.113.5 , 70.41.3.18 " }),
    );

    expect(captureLead.mock.calls[0][1].ip).toBe("203.0.113.5");
  });

  it("leaves ip and userAgent undefined when the headers are absent", async () => {
    await POST(post(valid));

    expect(captureLead.mock.calls[0][1]).toMatchObject({
      ip: undefined,
      userAgent: undefined,
    });
  });

  it("emails the agency and the visitor with the business identity", async () => {
    await POST(post(valid));

    const summary = expect.objectContaining({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "612-555-0199",
      zip: "55101",
      interest: "medicare-advantage",
      message: "Please call me.",
      sourcePath: "/contact",
    });
    expect(notify).toHaveBeenCalledWith(summary, business);
    expect(confirm).toHaveBeenCalledWith(summary, business);
  });

  it("never emails the honeypot or turnstile fields to the agency", async () => {
    await POST(post({ ...valid, turnstileToken: "tok-123" }));

    const summary = notify.mock.calls[0][0];
    expect(summary).not.toHaveProperty("turnstileToken");
    expect(summary).not.toHaveProperty("company");
    expect(summary).not.toHaveProperty("consent");
  });
});

describe("suppressed contacts", () => {
  beforeEach(() => {
    captureLead.mockResolvedValue({ leadId: 43, suppressed: true });
  });

  it("does not send a confirmation to someone who revoked contact", async () => {
    await POST(post(valid));

    expect(confirm).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalled();
  });

  it("still answers the visitor with success", async () => {
    const res = await POST(post(valid));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      leadId: 43,
      suppressed: true,
    });
  });
});

describe("email resilience", () => {
  it("still returns 201 when the notification email rejects", async () => {
    notify.mockRejectedValueOnce(new Error("SES down"));

    const res = await POST(post(valid));

    expect(res.status).toBe(201);
  });

  it("still returns 201 when both emails reject", async () => {
    notify.mockRejectedValueOnce(new Error("SES down"));
    confirm.mockRejectedValueOnce(new Error("SES down"));

    const res = await POST(post(valid));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ ok: true, leadId: 42 });
  });

  it("sends the confirmation even when the notification rejects", async () => {
    notify.mockRejectedValueOnce(new Error("SES down"));

    await POST(post(valid));

    expect(confirm).toHaveBeenCalled();
  });
});
