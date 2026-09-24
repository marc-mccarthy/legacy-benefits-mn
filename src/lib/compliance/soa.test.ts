import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISCLOSURE_VERSION,
  RECORD_RETENTION_YEARS,
  SOA_ATTESTATION,
} from "./disclosures";
import type { SoaInput } from "./soa-schema";

vi.mock("server-only", () => ({}));

const { db, schema } = vi.hoisted(() => ({
  schema: { soaSubmissions: { id: { __column: "id" } } },
  db: { insert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db, schema }));

// hashIp and blankToUndefined are used for real — they are pure, and the point
// of several cases below is that the SOA record uses the same hashing as a lead.
const { recordSoa } = await import("./soa");
const { hashIp } = await import("@/lib/leads/service");

const ROW_ID = 7;
let written: Record<string, never>;

const soa: SoaInput = {
  beneficiaryName: "Jane Doe",
  email: "Jane.Doe@Example.com",
  phone: "612-555-0199",
  address: "1 Main St, Saint Paul MN",
  productTypes: ["ma-mapd", "pdp"],
  agentName: "Nate",
  signature: "Jane Doe",
};

beforeEach(() => {
  written = {} as Record<string, never>;
  db.insert.mockReset().mockImplementation(() => ({
    values(values: Record<string, never>) {
      written = values;
      return { returning: async () => [{ id: ROW_ID }] };
    },
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the stored record", () => {
  it("writes the beneficiary's details to the SOA table", async () => {
    await recordSoa(soa);

    expect(db.insert).toHaveBeenCalledWith(schema.soaSubmissions);
    expect(written).toMatchObject({
      beneficiaryName: "Jane Doe",
      phone: "612-555-0199",
      address: "1 Main St, Saint Paul MN",
      productTypes: ["ma-mapd", "pdp"],
      agentName: "Nate",
      signature: "Jane Doe",
    });
  });

  it("lowercases the email so records are searchable", async () => {
    await recordSoa(soa);
    expect(written.email).toBe("jane.doe@example.com");
  });

  it.each(["email", "address", "agentName"] as const)(
    "stores a blank %s as undefined rather than an empty string",
    async (field) => {
      await recordSoa({ ...soa, [field]: "   " });
      expect(written[field]).toBeUndefined();
    },
  );

  it("keeps the phone exactly as typed", async () => {
    // Unlike a DNC entry this is evidence, not a match key, so it is not
    // reduced to digits — the record should read back as the person wrote it.
    await recordSoa({ ...soa, phone: "(612) 555-0199" });
    expect(written.phone).toBe("(612) 555-0199");
  });

  it("returns the new row id", async () => {
    await expect(recordSoa(soa)).resolves.toMatchObject({ id: ROW_ID });
  });
});

describe("attestation evidence", () => {
  it("stores the attestation text that was shown", async () => {
    await recordSoa(soa);

    // Reproducible for ten years means storing the words, not a reference to
    // them — the constant may be superseded by a later version.
    expect(written.attestationText).toBe(SOA_ATTESTATION);
    expect(written.attestationVersion).toBe(DISCLOSURE_VERSION);
  });

  it("timestamps the signature and returns the same instant", async () => {
    const result = await recordSoa(soa);

    expect(written.signedAt).toBeInstanceOf(Date);
    expect(result.signedAt).toBe(written.signedAt);
  });

  it("retains the record for ten years from signing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

    await recordSoa(soa);

    const retention = written.retentionUntil as unknown as Date;
    expect(retention.getUTCFullYear()).toBe(2026 + RECORD_RETENTION_YEARS);
    expect(RECORD_RETENTION_YEARS).toBe(10);
  });
});

describe("request metadata", () => {
  it("hashes the IP with the same scheme as a lead", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "test-secret");

    await recordSoa(soa, { ip: "203.0.113.5" });

    expect(written.ipHash).toBe(hashIp("203.0.113.5"));
    expect(written.ipHash).not.toBe("203.0.113.5");
    vi.unstubAllEnvs();
  });

  it("stores a null ipHash when no IP is known", async () => {
    await recordSoa(soa);
    expect(written.ipHash).toBeNull();
  });

  it("truncates a long user agent to the column width", async () => {
    await recordSoa(soa, { userAgent: "U".repeat(900) });
    expect(written.userAgent).toHaveLength(500);
  });

  it("leaves the user agent undefined when absent", async () => {
    await recordSoa(soa);
    expect(written.userAgent).toBeUndefined();
  });
});

describe("the 48-hour guidance flag", () => {
  const SIGNED_AT = "2026-09-08T12:00:00.000Z";

  function at(offsetMs: number) {
    return new Date(Date.parse(SIGNED_AT) + offsetMs).toISOString();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SIGNED_AT));
  });

  it("is false when no appointment is given", async () => {
    const result = await recordSoa(soa);

    expect(result.meetsFortyEightHourGuidance).toBe(false);
    expect(written.appointmentAt).toBeNull();
  });

  it("is true at exactly 48 hours", async () => {
    // Medicare asks for the SOA at least 48 hours ahead; the boundary itself
    // qualifies.
    const result = await recordSoa({
      ...soa,
      appointmentAt: at(48 * 3600_000),
    });
    expect(result.meetsFortyEightHourGuidance).toBe(true);
  });

  it("is false one millisecond short of 48 hours", async () => {
    const result = await recordSoa({
      ...soa,
      appointmentAt: at(48 * 3600_000 - 1),
    });
    expect(result.meetsFortyEightHourGuidance).toBe(false);
  });

  it("is true for an appointment well in the future", async () => {
    const result = await recordSoa({
      ...soa,
      appointmentAt: at(7 * 86_400_000),
    });
    expect(result.meetsFortyEightHourGuidance).toBe(true);
  });

  it("is false for a same-day appointment", async () => {
    const result = await recordSoa({ ...soa, appointmentAt: at(3600_000) });
    expect(result.meetsFortyEightHourGuidance).toBe(false);
  });

  it("is false for an appointment already in the past", async () => {
    const result = await recordSoa({ ...soa, appointmentAt: at(-3600_000) });
    expect(result.meetsFortyEightHourGuidance).toBe(false);
  });

  it("records rather than enforces the guidance", async () => {
    // Same-day appointments are permitted in defined circumstances, so a
    // false flag must still produce a stored SOA.
    const result = await recordSoa({ ...soa, appointmentAt: at(3600_000) });

    expect(result.meetsFortyEightHourGuidance).toBe(false);
    expect(result.id).toBe(ROW_ID);
    expect(written.appointmentAt).toBeInstanceOf(Date);
  });

  it("stores the appointment as a Date", async () => {
    await recordSoa({ ...soa, appointmentAt: at(48 * 3600_000) });

    const appointment = written.appointmentAt as unknown as Date;
    expect(appointment.toISOString()).toBe(at(48 * 3600_000));
  });
});

describe("an unparseable appointment date", () => {
  it("is now rejected by the schema before reaching here", async () => {
    // REGRESSION GUARD, at the layer that owns the rule.
    //
    // recordSoa still trusts its input — it is the schema's job to keep an
    // unparseable string out. Previously appointmentAt was a bare optional
    // string, so "next tuesday" reached this function, became an Invalid Date,
    // and was handed to the insert for Postgres to reject: a 500 with no SOA
    // on file where a 422 was correct.
    const { soaInputSchema } = await import("./soa-schema");

    expect(
      soaInputSchema.safeParse({ ...soa, appointmentAt: "next tuesday" }),
    ).toMatchObject({ success: false });
  });

  it("treats a blank appointment as absent", async () => {
    const result = await recordSoa({ ...soa, appointmentAt: "" });

    expect(written.appointmentAt).toBeNull();
    expect(result.meetsFortyEightHourGuidance).toBe(false);
  });
});
