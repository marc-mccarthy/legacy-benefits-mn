import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSoa, verifyTurnstile } = vi.hoisted(() => ({
  recordSoa: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/compliance/soa", () => ({ recordSoa }));
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile }));

// soaInputSchema and clientIp run for real — the validation contract is the
// thing worth asserting on a regulated record.
const { POST } = await import("./soa");

const SIGNED_AT = new Date("2026-09-08T12:00:00.000Z");

const valid = {
  beneficiaryName: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0199",
  address: "1 Main St, Saint Paul MN",
  productTypes: ["ma-mapd", "pdp"],
  agentName: "Nate",
  signature: "Jane Doe",
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://agency.example/api/soa", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recordSoa.mockReset().mockResolvedValue({
    id: 7,
    signedAt: SIGNED_AT,
    meetsFortyEightHourGuidance: true,
  });
  verifyTurnstile.mockReset().mockResolvedValue(true);
});

describe("bad requests", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(post("not json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(recordSoa).not.toHaveBeenCalled();
  });

  it("returns field-level issues for a failed validation", async () => {
    const res = await POST(post({ ...valid, signature: "" }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues.signature).toBeTruthy();
  });

  it("requires at least one product type", async () => {
    // An SOA that records no product types documents nothing; Medicare
    // requires the scope to be specific.
    const res = await POST(post({ ...valid, productTypes: [] }));

    expect(res.status).toBe(422);
    expect(recordSoa).not.toHaveBeenCalled();
  });

  it("rejects an unknown product type", async () => {
    const res = await POST(post({ ...valid, productTypes: ["car-insurance"] }));

    expect(res.status).toBe(422);
    expect(recordSoa).not.toHaveBeenCalled();
  });

  it("requires a signature", async () => {
    const unsigned: Partial<typeof valid> = { ...valid };
    delete unsigned.signature;

    const res = await POST(post(unsigned));

    expect(res.status).toBe(422);
    expect(recordSoa).not.toHaveBeenCalled();
  });

  it("requires a usable phone number", async () => {
    const res = await POST(post({ ...valid, phone: "123" }));

    expect(res.status).toBe(422);
    expect(recordSoa).not.toHaveBeenCalled();
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
    expect(recordSoa).not.toHaveBeenCalled();
  });

  it("reads the token off the raw body, not the parsed data", async () => {
    // soaInputSchema has no turnstileToken field, so zod strips it — the
    // route has to reach into the original body for it.
    await POST(
      post(
        { ...valid, turnstileToken: "tok-123" },
        { "x-forwarded-for": "203.0.113.5" },
      ),
    );

    expect(verifyTurnstile).toHaveBeenCalledWith("tok-123", "203.0.113.5");
  });

  it("passes an undefined token when none was sent", async () => {
    await POST(post(valid));
    expect(verifyTurnstile).toHaveBeenCalledWith(undefined, undefined);
  });
});

describe("recording the appointment scope", () => {
  it("returns 201 with the record id and signing time", async () => {
    const res = await POST(post(valid));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: 7,
      // Serialised so the confirmation can show the beneficiary exactly when
      // they signed.
      signedAt: "2026-09-08T12:00:00.000Z",
      meetsFortyEightHourGuidance: true,
    });
  });

  it("hands the validated input and request metadata to the recorder", async () => {
    await POST(
      post(valid, {
        "x-forwarded-for": "203.0.113.5",
        "user-agent": "Mozilla/5.0",
      }),
    );

    expect(recordSoa).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiaryName: "Jane Doe",
        productTypes: ["ma-mapd", "pdp"],
        signature: "Jane Doe",
      }),
      { ip: "203.0.113.5", userAgent: "Mozilla/5.0" },
    );
  });

  it("takes only the first hop of x-forwarded-for", async () => {
    await POST(
      post(valid, { "x-forwarded-for": " 203.0.113.5 , 70.41.3.18 " }),
    );

    expect(recordSoa.mock.calls[0][1].ip).toBe("203.0.113.5");
  });

  it("leaves ip and userAgent undefined when the headers are absent", async () => {
    await POST(post(valid));

    expect(recordSoa.mock.calls[0][1]).toMatchObject({
      ip: undefined,
      userAgent: undefined,
    });
  });

  it("never forwards the turnstile token into the record", async () => {
    await POST(post({ ...valid, turnstileToken: "tok-123" }));

    expect(recordSoa.mock.calls[0][0]).not.toHaveProperty("turnstileToken");
  });

  it("still succeeds when the 48-hour guidance is not met", async () => {
    // Same-day appointments are permitted in defined circumstances; the flag
    // is recorded, not enforced.
    recordSoa.mockResolvedValueOnce({
      id: 8,
      signedAt: SIGNED_AT,
      meetsFortyEightHourGuidance: false,
    });

    const res = await POST(
      post({ ...valid, appointmentAt: SIGNED_AT.toISOString() }),
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      meetsFortyEightHourGuidance: false,
    });
  });

  it("accepts a submission with only the required fields", async () => {
    const res = await POST(
      post({
        beneficiaryName: "Jane Doe",
        phone: "612-555-0199",
        productTypes: ["supplement"],
        signature: "Jane Doe",
      }),
    );

    expect(res.status).toBe(201);
  });
});

describe("the appointment date", () => {
  // REGRESSION GUARD.
  //
  // appointmentAt used to be a bare optional string, so an unparseable value
  // passed validation, became an Invalid Date inside recordSoa, and was
  // rejected by Postgres — a 500 for the visitor and no SOA on file, where a
  // 422 at this boundary was the correct answer.
  it.each(["next tuesday", "not a date", "13/45/2026"])(
    "rejects %j with a 422 instead of failing at the database",
    async (value) => {
      const res = await POST(post({ ...valid, appointmentAt: value }));

      expect(res.status).toBe(422);
      expect(recordSoa).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a full ISO timestamp", "2026-09-10T14:30:00.000Z"],
    ["an offset timestamp", "2026-09-10T14:30:00-05:00"],
    ["a local datetime-local value", "2026-09-10T14:30"],
    ["a bare date", "2026-09-10"],
  ])("accepts %s", async (_label, value) => {
    // Kept permissive about shape so adding an <input type="datetime-local">
    // to the form later does not need another schema change.
    const res = await POST(post({ ...valid, appointmentAt: value }));

    expect(res.status).toBe(201);
    expect(recordSoa.mock.calls[0][0].appointmentAt).toBe(value);
  });

  it("accepts a blank appointment as 'not scheduled'", async () => {
    const res = await POST(post({ ...valid, appointmentAt: "" }));
    expect(res.status).toBe(201);
  });
});
