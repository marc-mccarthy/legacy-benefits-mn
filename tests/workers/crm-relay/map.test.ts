import { describe, expect, it } from "vitest";
import {
  individualForm,
  noteBody,
  splitName,
  submissionDate,
  tenDigitPhone,
  zip5,
  type RelayLead,
} from "../../../workers/crm-relay/src/map";

const KEY = "3f2b8c1e-0000-4000-8000-000000000001";

const full: RelayLead = {
  name: "Jane Q Doe",
  email: "jane@example.com",
  phone: "+1 (612) 555-0101",
  zip: "55401-1234",
  interest: "medicare-advantage",
  message: "Turning 65 in March.\nPlease call after 3pm.",
  sourcePath: "/contact",
  utm: { utm_source: "google", utm_campaign: "fall" },
  consentedAt: "2026-10-16T14:02:11.000Z",
  consentVersion: "2026-09-01.1",
};

const minimal: RelayLead = {
  name: "Cher",
  email: "cher@example.com",
  consentedAt: "2026-10-16T14:02:11.000Z",
  consentVersion: "2026-09-01.1",
};

describe("splitName", () => {
  it("puts the first word in first and the rest in last", () => {
    expect(splitName("Jane Q Doe")).toEqual({ first: "Jane", last: "Q Doe" });
  });

  it("collapses extra whitespace", () => {
    expect(splitName("  Jane   Doe ")).toEqual({ first: "Jane", last: "Doe" });
  });

  it("leaves last undefined for a single word", () => {
    expect(splitName("Cher")).toEqual({ first: "Cher", last: undefined });
  });
});

describe("tenDigitPhone", () => {
  it.each([
    ["612-555-0101", "6125550101"],
    ["(612) 555-0101", "6125550101"],
    ["+1 612 555 0101", "6125550101"],
    ["16125550101", "6125550101"],
  ])("turns %s into %s", (input, expected) => {
    expect(tenDigitPhone(input)).toBe(expected);
  });
});

describe("zip5", () => {
  it("keeps a 5-digit ZIP", () => {
    expect(zip5("55401")).toBe("55401");
  });

  it("cuts ZIP+4 to 5 digits", () => {
    expect(zip5("55401-1234")).toBe("55401");
  });
});

describe("submissionDate", () => {
  it("formats in Central time", () => {
    expect(submissionDate("2026-10-16T14:02:11.000Z")).toBe("Oct 16, 2026");
  });

  it("uses the Central date when UTC has already rolled over", () => {
    expect(submissionDate("2026-10-17T03:30:00.000Z")).toBe("Oct 16, 2026");
  });
});

describe("noteBody", () => {
  it("lists every field for a first submission", () => {
    expect(noteBody(full, KEY, false)).toBe(
      [
        "Website form submission on Oct 16, 2026",
        "Name: Jane Q Doe",
        "Email: jane@example.com",
        "Phone: (612) 555-0101",
        "ZIP: 55401-1234",
        "Interested in: Medicare Advantage (Part C)",
        "Message: Turning 65 in March.\nPlease call after 3pm.",
        "Page: /contact",
        "UTM: utm_source=google, utm_campaign=fall",
        "TCPA consent: agreed 2026-10-16T14:02:11.000Z, disclosure version 2026-09-01.1",
        `Ref: ${KEY}`,
      ].join("\n"),
    );
  });

  it("changes only the first line for a repeat submission", () => {
    const first = noteBody(full, KEY, false).split("\n");
    const repeat = noteBody(full, KEY, true).split("\n");
    expect(repeat[0]).toBe("Filled out the website form again on Oct 16, 2026");
    expect(repeat.slice(1)).toEqual(first.slice(1));
  });

  it("omits lines for missing optional fields", () => {
    expect(noteBody(minimal, KEY, false)).toBe(
      [
        "Website form submission on Oct 16, 2026",
        "Name: Cher",
        "Email: cher@example.com",
        "TCPA consent: agreed 2026-10-16T14:02:11.000Z, disclosure version 2026-09-01.1",
        `Ref: ${KEY}`,
      ].join("\n"),
    );
  });

  it("falls back to the raw value for an unknown interest", () => {
    expect(noteBody({ ...minimal, interest: "dental" }, KEY, false)).toContain(
      "Interested in: dental",
    );
  });

  it("omits the UTM line when utm is empty", () => {
    expect(noteBody({ ...minimal, utm: {} }, KEY, false)).not.toContain("UTM:");
  });

  it("never prints undefined", () => {
    expect(noteBody(minimal, KEY, true)).not.toContain("undefined");
  });
});

describe("individualForm", () => {
  it("builds the MedicarePRO create body", () => {
    expect(individualForm(full, KEY)).toEqual({
      indSource: 9,
      isLead: 1,
      indStatus: "Active Prospect",
      externalId: KEY,
      indFirstname: "Jane",
      indLastname: "Q Doe",
      indEmailAddress: "jane@example.com",
      indPhoneNumber: "6125550101",
      indAddressZip: "55401",
      indNoteBody: noteBody(full, KEY, false),
    });
  });

  it("leaves out keys for missing fields and never sends a state", () => {
    const body = individualForm(minimal, KEY);
    expect(body).toEqual({
      indSource: 9,
      isLead: 1,
      indStatus: "Active Prospect",
      externalId: KEY,
      indFirstname: "Cher",
      indEmailAddress: "cher@example.com",
      indNoteBody: noteBody(minimal, KEY, false),
    });
    expect(body).not.toHaveProperty("indAddressState");
  });
});
