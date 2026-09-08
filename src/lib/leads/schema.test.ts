import { describe, expect, it } from "vitest";
import { blankToUndefined, leadInputSchema } from "./schema";

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  zip: "55101",
  consent: true,
};

describe("leadInputSchema", () => {
  it("accepts a minimal valid submission", () => {
    expect(leadInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a submission without consent", () => {
    const result = leadInputSchema.safeParse({ ...valid, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(
      leadInputSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects a malformed ZIP", () => {
    expect(leadInputSchema.safeParse({ ...valid, zip: "5510" }).success).toBe(
      false,
    );
  });

  it("accepts ZIP+4", () => {
    expect(
      leadInputSchema.safeParse({ ...valid, zip: "55101-1234" }).success,
    ).toBe(true);
  });

  it("accepts the select's placeholder value for interest", () => {
    // Regression: "" failed the enum, which blocked submission with no
    // visible error whenever the dropdown was left untouched.
    const result = leadInputSchema.safeParse({ ...valid, interest: "" });
    expect(result.success).toBe(true);
  });

  it("still rejects an unknown interest value", () => {
    expect(
      leadInputSchema.safeParse({ ...valid, interest: "not-a-real-option" })
        .success,
    ).toBe(false);
  });

  it("accepts blank optional fields without applying their format rules", () => {
    // A blank ZIP must not be validated against the ZIP pattern.
    const result = leadInputSchema.safeParse({ ...valid, phone: "", zip: "" });
    expect(result.success).toBe(true);
  });

  it("converts blanks to undefined so they are stored as NULL", () => {
    expect(blankToUndefined("")).toBeUndefined();
    expect(blankToUndefined("   ")).toBeUndefined();
    expect(blankToUndefined(undefined)).toBeUndefined();
    expect(blankToUndefined(" 55101 ")).toBe("55101");
  });

  it("parses a filled honeypot rather than rejecting it", () => {
    // Rejecting here would leak which field is the trap. The route accepts
    // the request and drops it instead.
    const result = leadInputSchema.safeParse({
      ...valid,
      company: "spam corp",
    });
    expect(result.success).toBe(true);
    expect(result.data?.company).toBe("spam corp");
  });
});
