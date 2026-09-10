import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, schema } = vi.hoisted(() => ({
  schema: {
    dncRequests: {
      id: { __column: "id" },
      email: { __column: "email" },
      phone: { __column: "phone" },
    },
  },
  db: { select: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db, schema }));

vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
  or: (...clauses: unknown[]) => ({ op: "or", clauses }),
}));

const { isSuppressed, normalizePhone } = await import("./suppression");

type Clause = {
  op: string;
  column?: { __column: string };
  value?: unknown;
  clauses?: Clause[];
};

let whereClause: Clause | undefined;
let limitArg: number | undefined;
let rows: Array<{ id: number }> = [];

beforeEach(() => {
  whereClause = undefined;
  limitArg = undefined;
  rows = [];
  db.select.mockReset().mockImplementation(() => ({
    from: () => ({
      where: (clause: Clause) => {
        whereClause = clause;
        return {
          limit: async (n: number) => {
            limitArg = n;
            return rows;
          },
        };
      },
    }),
  }));
});

/** The single eq() clause, whether or not it was wrapped in or(). */
function clauses(): Clause[] {
  if (!whereClause) return [];
  return whereClause.op === "or" ? whereClause.clauses! : [whereClause];
}

function valueFor(column: keyof typeof schema.dncRequests) {
  return clauses().find((c) => c.column === schema.dncRequests[column])?.value;
}

describe("isSuppressed with nothing to match on", () => {
  it("returns false when given neither an email nor a phone", async () => {
    await expect(isSuppressed()).resolves.toBe(false);
  });

  it("does not query at all", async () => {
    // A query with no clauses would match the first DNC row and suppress
    // every lead on the site.
    await isSuppressed();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("treats blank strings as absent", async () => {
    await expect(isSuppressed("", "")).resolves.toBe(false);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("treats a phone of only separators as absent", async () => {
    await expect(isSuppressed(undefined, "()- .")).resolves.toBe(false);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("isSuppressed matching", () => {
  it("reports a hit when a row exists", async () => {
    rows = [{ id: 1 }];
    await expect(isSuppressed("jane@example.com")).resolves.toBe(true);
  });

  it("reports no hit when nothing matches", async () => {
    rows = [];
    await expect(isSuppressed("jane@example.com")).resolves.toBe(false);
  });

  it("stops at the first row", async () => {
    await isSuppressed("jane@example.com");
    // Existence is all that matters; fetching the whole list would scale badly.
    expect(limitArg).toBe(1);
  });
});

describe("isSuppressed email handling", () => {
  it("matches on the email alone when no phone is given", async () => {
    await isSuppressed("jane@example.com");

    expect(whereClause!.op).toBe("eq");
    expect(valueFor("email")).toBe("jane@example.com");
  });

  it("lowercases the address before comparing", async () => {
    await isSuppressed("Jane.Doe@Example.COM");

    // recordDncRequest stores addresses lowercased, so the lookup must match
    // that or a capitalised resubmission would slip past suppression.
    expect(valueFor("email")).toBe("jane.doe@example.com");
  });
});

describe("isSuppressed phone handling", () => {
  it("matches on the phone alone when no email is given", async () => {
    await isSuppressed(undefined, "6125550199");

    expect(whereClause!.op).toBe("eq");
    expect(valueFor("phone")).toBe("6125550199");
  });

  it.each([
    "(612) 555-0199",
    "612-555-0199",
    "612.555.0199",
    "612 555 0199",
    " 6125550199 ",
  ])("strips formatting from %s", async (input) => {
    await isSuppressed(undefined, input);

    // Suppression is stored digits-only precisely so punctuation cannot
    // defeat it.
    expect(valueFor("phone")).toBe("6125550199");
  });
});

describe("isSuppressed with both identifiers", () => {
  it("matches either the email or the phone", async () => {
    await isSuppressed("jane@example.com", "612-555-0199");

    // A person who opted out by phone must stay suppressed when they later
    // submit with an email, and vice versa.
    expect(whereClause!.op).toBe("or");
    expect(whereClause!.clauses).toHaveLength(2);
  });

  it("carries the normalised values into both clauses", async () => {
    await isSuppressed("JANE@example.com", "(612) 555-0199");

    expect(valueFor("email")).toBe("jane@example.com");
    expect(valueFor("phone")).toBe("6125550199");
  });

  it("falls back to a single clause when only one is usable", async () => {
    await isSuppressed("jane@example.com", "   ");

    expect(whereClause!.op).toBe("eq");
    expect(valueFor("email")).toBe("jane@example.com");
  });
});

describe("normalizePhone", () => {
  it("returns undefined for no input", () => {
    expect(normalizePhone()).toBeUndefined();
    expect(normalizePhone("")).toBeUndefined();
  });

  it("keeps a plain ten-digit number", () => {
    expect(normalizePhone("6125550199")).toBe("6125550199");
  });

  it.each(["(612) 555-0199", "612-555-0199", "612.555.0199", "612 555 0199"])(
    "reduces %s to digits",
    (input) => {
      expect(normalizePhone(input)).toBe("6125550199");
    },
  );

  it("rejects anything shorter than ten digits", () => {
    // A partial number would suppress every number sharing that prefix.
    expect(normalizePhone("612555019")).toBeUndefined();
    expect(normalizePhone("12345")).toBeUndefined();
  });

  it("rejects input with no digits at all", () => {
    expect(normalizePhone("not a phone")).toBeUndefined();
  });

  it("accepts exactly ten digits", () => {
    expect(normalizePhone("1234567890")).toBe("1234567890");
  });
});

describe("normalizePhone country code handling", () => {
  it("strips a leading country code", () => {
    expect(normalizePhone("+1 612-555-0199")).toBe("6125550199");
    expect(normalizePhone("+1 (612) 555-0199")).toBe("6125550199");
    expect(normalizePhone("1-612-555-0199")).toBe("6125550199");
  });

  it.each([
    "+1 612-555-0199",
    "1 (612) 555-0199",
    "612-555-0199",
    "6125550199",
    "+1.612.555.0199",
  ])("reduces %s to the same ten digits", (input) => {
    // REGRESSION GUARD.
    //
    // These previously canonicalised to different strings, so opting out as
    // "+1 612-555-0199" stored "16125550199" while a later submission of
    // "612-555-0199" searched for "6125550199" — no match, and the person was
    // contacted again. That is precisely the TCPA failure suppression exists
    // to prevent.
    expect(normalizePhone(input)).toBe("6125550199");
  });

  it("keeps only the last ten digits of an over-long number", () => {
    // Over-suppressing a foreign number that collides is the right way to be
    // wrong: a needless suppression costs a lead, a missed one costs a claim.
    expect(normalizePhone("+44 20 7946 0958")).toBe("2079460958");
  });
});

describe("lookup and storage agree", () => {
  /** What isSuppressed will search for, given a raw submitted phone. */
  async function lookupValue(phone: string) {
    await isSuppressed(undefined, phone);
    return valueFor("phone");
  }

  it.each([
    "6125550199",
    "612-555-0199",
    "(612) 555-0199",
    "612.555.0199",
    "+1 612-555-0199",
    "1 (612) 555-0199",
  ])("looks up the same value it would have stored for %s", async (input) => {
    // Both sides go through normalizePhone now, so lookup and storage cannot
    // drift apart. This is the invariant the module rests on.
    expect(await lookupValue(input)).toBe(normalizePhone(input));
    expect(await lookupValue(input)).toBe("6125550199");
  });

  it("does not search for a number too short to have been stored", async () => {
    // One shared length gate: a short number is absent on both sides rather
    // than producing a query that could only ever miss.
    await isSuppressed(undefined, "12345");

    expect(db.select).not.toHaveBeenCalled();
    expect(normalizePhone("12345")).toBeUndefined();
  });
});
