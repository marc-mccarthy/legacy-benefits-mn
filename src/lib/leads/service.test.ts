import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISCLOSURE_VERSION,
  RECORD_RETENTION_YEARS,
} from "@/lib/compliance/disclosures";
import type { LeadInput } from "./schema";

const { db, schema, isSuppressed } = vi.hoisted(() => ({
  // Sentinels — only their identity matters, so a spec can tell which table
  // each insert targeted.
  schema: { leads: { __table: "leads" }, crmOutbox: { __table: "crm_outbox" } },
  db: { transaction: vi.fn() },
  isSuppressed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db, schema }));
vi.mock("@/lib/compliance/suppression", () => ({ isSuppressed }));

const { captureLead, hashIp } = await import("./service");

const inserted: Array<{ table: unknown; values: Record<string, never> }> = [];
const LEAD_ID = 42;

/**
 * Stands in for a drizzle transaction. `.values()` returns a thenable that
 * also has `.returning()`, because the leads insert chains one and the outbox
 * insert is awaited directly.
 */
function makeTx() {
  return {
    insert(table: unknown) {
      return {
        values(values: Record<string, never>) {
          inserted.push({ table, values });
          return {
            returning: async () => [{ id: LEAD_ID }],
            then: (
              ok: (v?: unknown) => unknown,
              err: (e: unknown) => unknown,
            ) => Promise.resolve(undefined).then(ok, err),
          };
        },
      };
    },
  };
}

const lead: LeadInput = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0199",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me.",
  sourcePath: "/contact",
  consent: true,
};

/** Values written to the leads table. */
function leadRow() {
  return inserted.find((i) => i.table === schema.leads)!.values;
}

/** Values written to the outbox, or undefined when nothing was queued. */
function outboxRow() {
  return inserted.find((i) => i.table === schema.crmOutbox)?.values;
}

beforeEach(() => {
  inserted.length = 0;
  db.transaction.mockReset().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: (tx: any) => unknown) => cb(makeTx()),
  );
  isSuppressed.mockReset().mockResolvedValue(false);
  vi.stubEnv("PAYLOAD_SECRET", "test-secret");
  vi.stubEnv("BUSINESS_NAME", undefined);
  vi.stubEnv("BUSINESS_PHONE", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("hashIp", () => {
  it("produces a 64-character hex digest", () => {
    expect(hashIp("203.0.113.5")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never returns the address itself", () => {
    expect(hashIp("203.0.113.5")).not.toContain("203.0.113.5");
  });

  it("is stable for the same address", () => {
    expect(hashIp("203.0.113.5")).toBe(hashIp("203.0.113.5"));
  });

  it("separates different addresses", () => {
    expect(hashIp("203.0.113.5")).not.toBe(hashIp("203.0.113.6"));
  });

  it("is salted by PAYLOAD_SECRET", () => {
    const withSecret = hashIp("203.0.113.5");
    vi.stubEnv("PAYLOAD_SECRET", "a-different-secret");

    // The secret is the only thing standing between this digest and a
    // brute-force reversal — IPv4 is small enough to enumerate.
    expect(hashIp("203.0.113.5")).not.toBe(withSecret);
  });

  it("still hashes when no secret is configured", () => {
    vi.stubEnv("PAYLOAD_SECRET", undefined);
    expect(hashIp("203.0.113.5")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("captureLead lead row", () => {
  it("stores the submitted contact details", async () => {
    await captureLead(lead);

    expect(leadRow()).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "612-555-0199",
      zip: "55101",
      interest: "medicare-advantage",
      message: "Please call me.",
      sourcePath: "/contact",
    });
  });

  it("converts blank optional fields to undefined so they store as NULL", async () => {
    await captureLead({
      ...lead,
      phone: "",
      zip: "   ",
      interest: "",
      message: "",
      sourcePath: "",
    });

    expect(leadRow()).toMatchObject({
      phone: undefined,
      zip: undefined,
      interest: undefined,
      message: undefined,
      sourcePath: undefined,
    });
  });

  it("passes utm parameters through untouched", async () => {
    await captureLead({ ...lead, utm: { utm_source: "google" } });
    expect(leadRow().utm).toEqual({ utm_source: "google" });
  });

  it("hashes the IP rather than storing it", async () => {
    await captureLead(lead, { ip: "203.0.113.5" });

    expect(leadRow().ipHash).toBe(hashIp("203.0.113.5"));
    expect(leadRow().ipHash).not.toBe("203.0.113.5");
  });

  it("stores a null ipHash when no IP is known", async () => {
    await captureLead(lead);
    expect(leadRow().ipHash).toBeNull();
  });

  it("truncates a long user agent to the column width", async () => {
    await captureLead(lead, { userAgent: "U".repeat(900) });
    expect(leadRow().userAgent).toHaveLength(500);
  });

  it("leaves the user agent undefined when absent", async () => {
    await captureLead(lead);
    expect(leadRow().userAgent).toBeUndefined();
  });

  it("timestamps the consent", async () => {
    await captureLead(lead);
    expect(leadRow().consentedAt).toBeInstanceOf(Date);
  });

  it("retains the record for the CMS-mandated ten years", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

    await captureLead(lead);

    const retention = leadRow().retentionUntil as unknown as Date;
    expect(retention.getUTCFullYear()).toBe(2026 + RECORD_RETENTION_YEARS);
    expect(RECORD_RETENTION_YEARS).toBe(10);
  });
});

describe("captureLead consent evidence", () => {
  it("records the disclosure version that was in force", async () => {
    await captureLead(lead);
    expect(leadRow().consentVersion).toBe(DISCLOSURE_VERSION);
  });

  it("regenerates the consent text on the server", async () => {
    await captureLead(lead, {
      business: { name: "Acme Medicare", phone: "612-555-0100" },
    });

    // Built here, never taken from the request body — a consent record the
    // submitter could edit would be worthless as evidence.
    const text = leadRow().consentText as unknown as string;
    expect(text).toContain("Acme Medicare");
    expect(text).toContain("(612-555-0100)");
    expect(text).toContain("consent is not a condition of purchase");
    expect(text).toContain("I may revoke this consent at any time");
  });

  it("prefers the business identity over the environment", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");

    await captureLead(lead, { business: { name: "CMS Agency" } });

    expect(leadRow().consentText).toContain("CMS Agency");
  });

  it("falls back to BUSINESS_NAME", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    await captureLead(lead);
    expect(leadRow().consentText).toContain("Env Agency");
  });

  it("falls back again to a generic name", async () => {
    // Never store consent naming "undefined" as the calling business.
    await captureLead(lead);
    const text = leadRow().consentText as unknown as string;
    expect(text).toContain("this agency");
    expect(text).not.toContain("undefined");
  });

  it("omits the phone clause when no number is known", async () => {
    await captureLead(lead);
    expect(leadRow().consentText).not.toContain("()");
  });

  it("falls back to BUSINESS_PHONE", async () => {
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");
    await captureLead(lead);
    expect(leadRow().consentText).toContain("(612-555-0000)");
  });
});

describe("captureLead outbox row", () => {
  it("queues the lead for the CRM in the same transaction", async () => {
    await captureLead(lead);

    // One transaction covering both writes: a lead can never exist without
    // its delivery record, and vice versa.
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(outboxRow()).toMatchObject({ leadId: LEAD_ID });
  });

  it("assigns a UUID idempotency key", async () => {
    await captureLead(lead);

    expect(outboxRow()!.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("gives each lead its own key", async () => {
    await captureLead(lead);
    const first = outboxRow()!.idempotencyKey;
    inserted.length = 0;

    await captureLead(lead);

    expect(outboxRow()!.idempotencyKey).not.toBe(first);
  });

  it("carries the contact details and consent version in the payload", async () => {
    await captureLead({ ...lead, utm: { utm_source: "google" } });

    expect(outboxRow()!.payload).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "612-555-0199",
      zip: "55101",
      interest: "medicare-advantage",
      message: "Please call me.",
      sourcePath: "/contact",
      utm: { utm_source: "google" },
      consentVersion: DISCLOSURE_VERSION,
    });
  });

  it("serialises consentedAt as an ISO string for the CRM", async () => {
    await captureLead(lead);

    const payload = outboxRow()!.payload as unknown as { consentedAt: string };
    expect(payload.consentedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("blanks the payload's optional fields rather than sending empty strings", async () => {
    await captureLead({ ...lead, phone: "", zip: "" });

    expect(outboxRow()!.payload).toMatchObject({
      phone: undefined,
      zip: undefined,
    });
  });

  it("returns the new lead id", async () => {
    await expect(captureLead(lead)).resolves.toEqual({
      leadId: LEAD_ID,
      suppressed: false,
    });
  });
});

describe("captureLead suppression", () => {
  it("checks the suppression list by email and phone", async () => {
    await captureLead(lead);
    expect(isSuppressed).toHaveBeenCalledWith(
      "jane@example.com",
      "612-555-0199",
    );
  });

  it("still stores a suppressed submission", async () => {
    isSuppressed.mockResolvedValueOnce(true);

    const result = await captureLead(lead);

    // The person did fill in the form; the record is kept.
    expect(leadRow()).toMatchObject({ email: "jane@example.com" });
    expect(result).toEqual({ leadId: LEAD_ID, suppressed: true });
  });

  it("never queues a suppressed submission to the CRM", async () => {
    isSuppressed.mockResolvedValueOnce(true);

    await captureLead(lead);

    // Re-contacting someone who revoked consent is the exact failure TCPA
    // penalises; releasing this is a human decision.
    expect(outboxRow()).toBeUndefined();
  });
});
