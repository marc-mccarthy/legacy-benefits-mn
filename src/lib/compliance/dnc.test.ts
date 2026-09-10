import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DncInput } from "./dnc-schema";

vi.mock("server-only", () => ({}));

const { db, schema } = vi.hoisted(() => ({
  schema: { dncRequests: { id: { __column: "id" } } },
  db: { insert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db, schema }));

const { recordDncRequest } = await import("./dnc");
const { hashIp } = await import("@/lib/leads/service");
const { normalizePhone } = await import("./suppression");

const ROW_ID = 3;
let written: Record<string, never>;

const request: DncInput = {
  email: "Jane.Doe@Example.com",
  phone: "612-555-0199",
  requestType: "revoke-contact",
  notes: "Please stop calling.",
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

describe("the stored opt-out", () => {
  it("writes to the suppression table and returns the new id", async () => {
    await expect(recordDncRequest(request)).resolves.toEqual({ id: ROW_ID });
    expect(db.insert).toHaveBeenCalledWith(schema.dncRequests);
  });

  it.each(["revoke-contact", "do-not-sell", "delete-my-data"] as const)(
    "records a %s request",
    async (requestType) => {
      await recordDncRequest({ ...request, requestType });
      expect(written.requestType).toBe(requestType);
    },
  );

  it("keeps the free-text note", async () => {
    await recordDncRequest(request);
    expect(written.notes).toBe("Please stop calling.");
  });

  it("stores a blank note as undefined rather than an empty string", async () => {
    await recordDncRequest({ ...request, notes: "   " });
    expect(written.notes).toBeUndefined();
  });

  it("hashes the IP rather than storing it", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "test-secret");

    await recordDncRequest(request, { ip: "203.0.113.5" });

    expect(written.ipHash).toBe(hashIp("203.0.113.5"));
    expect(written.ipHash).not.toBe("203.0.113.5");
    vi.unstubAllEnvs();
  });

  it("stores a null ipHash when no IP is known", async () => {
    await recordDncRequest(request);
    expect(written.ipHash).toBeNull();
  });
});

describe("identifiers are stored in the form the lookup searches for", () => {
  it("lowercases the email", async () => {
    await recordDncRequest(request);

    // isSuppressed lowercases before comparing, so a capitalised opt-out must
    // not become unmatchable.
    expect(written.email).toBe("jane.doe@example.com");
  });

  it("stores a blank email as undefined", async () => {
    await recordDncRequest({ ...request, email: "   " });
    expect(written.email).toBeUndefined();
  });

  it.each([
    "6125550199",
    "612-555-0199",
    "(612) 555-0199",
    "612.555.0199",
    "+1 612-555-0199",
    "1 (612) 555-0199",
  ])("canonicalises %s to the same ten digits", async (phone) => {
    await recordDncRequest({ ...request, phone });

    // The whole point of the shared helper: every way of writing one number
    // stores one value, so isSuppressed finds it however it is submitted next.
    expect(written.phone).toBe("6125550199");
    expect(written.phone).toBe(normalizePhone(phone));
  });
});

describe("a phone too short to canonicalise", () => {
  // REGRESSION GUARD, at the layer that owns the rule.
  //
  // recordDncRequest still trusts its input. Previously dncInputSchema set no
  // minimum on phone, so "12345" satisfied the "email or phone" rule, reached
  // here, and normalizePhone discarded it — recording an opt-out with BOTH
  // identifiers null. It suppressed nobody while the visitor was told it
  // worked, and they stayed contactable. The schema now rejects it.
  it.each(["12345", "612555019", "abc"])(
    "is kept out by the schema for %j",
    async (phone) => {
      const { dncInputSchema } = await import("./dnc-schema");

      expect(
        dncInputSchema.safeParse({ phone, requestType: "revoke-contact" }),
      ).toMatchObject({ success: false });
    },
  );

  it("would still store nothing if one ever reached this far", async () => {
    // Documents why the schema gate is load-bearing rather than belt-and-braces.
    await recordDncRequest({ phone: "12345", requestType: "revoke-contact" });

    expect(written.phone).toBeUndefined();
    expect(written.email).toBeUndefined();
  });
});
