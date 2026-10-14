import { describe, expect, it } from "vitest";
import { blankToUndefined, leadInputSchema } from "@/lib/leads/schema";

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "(651) 555-0123",
  zip: "55101",
  interest: "medicare-advantage",
  consent: true,
};

describe("leadInputSchema", () => {
  it("accepts a submission with every required field", () => {
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

  it("rejects the select's placeholder value for interest", () => {
    const result = leadInputSchema.safeParse({ ...valid, interest: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Please choose what we can help with",
    );
  });

  it("still rejects an unknown interest value", () => {
    expect(
      leadInputSchema.safeParse({ ...valid, interest: "not-a-real-option" })
        .success,
    ).toBe(false);
  });

  it.each(["phone", "zip", "interest"])("requires %s", (field) => {
    const blank = leadInputSchema.safeParse({ ...valid, [field]: "" });
    const missing = leadInputSchema.safeParse({
      ...valid,
      [field]: undefined,
    });
    expect(blank.success).toBe(false);
    expect(missing.success).toBe(false);
  });

  it("leaves the free-text message optional", () => {
    expect(
      leadInputSchema.safeParse({ ...valid, message: undefined }).success,
    ).toBe(true);
    expect(leadInputSchema.safeParse({ ...valid, message: "" }).success).toBe(
      true,
    );
  });

  it.each(["(651) 555-0123", "6515550123", "+1 651 555 0123"])(
    "accepts the ten-digit phone %j",
    (phone) => {
      expect(leadInputSchema.safeParse({ ...valid, phone }).success).toBe(true);
    },
  );

  it.each(["(651) 555-012", "555-0123", "abc"])(
    "rejects the incomplete phone %j",
    (phone) => {
      const result = leadInputSchema.safeParse({ ...valid, phone });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Please enter a 10-digit phone number",
      );
    },
  );

  it("converts blanks to undefined so they are stored as NULL", () => {
    expect(blankToUndefined("")).toBeUndefined();
    expect(blankToUndefined("   ")).toBeUndefined();
    expect(blankToUndefined(undefined)).toBeUndefined();
    expect(blankToUndefined(" 55101 ")).toBe("55101");
  });

  it("parses a filled honeypot rather than rejecting it", () => {
    const result = leadInputSchema.safeParse({
      ...valid,
      company: "spam corp",
    });
    expect(result.success).toBe(true);
    expect(result.data?.company).toBe("spam corp");
  });
});
