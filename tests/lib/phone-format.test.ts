import { describe, expect, it } from "vitest";
import { caretInFormatted, formatUsPhone } from "@/lib/phone-format";

describe("formatUsPhone", () => {
  it.each([
    ["", ""],
    ["6", "(6"],
    ["651", "(651"],
    ["6515", "(651) 5"],
    ["651555", "(651) 555"],
    ["6515550", "(651) 555-0"],
    ["6515550123", "(651) 555-0123"],
  ])("formats %j as %j while typing", (typed, shown) => {
    expect(formatUsPhone(typed)).toBe(shown);
  });

  it.each([
    "651.555.0123",
    "651-555-0123",
    "(651) 555-0123",
    "+1 651 555 0123",
    "1-651-555-0123",
  ])("reformats a pasted %j", (pasted) => {
    expect(formatUsPhone(pasted)).toBe("(651) 555-0123");
  });

  it("stops at ten digits", () => {
    expect(formatUsPhone("651555012399")).toBe("(651) 555-0123");
  });

  it("drops letters and symbols", () => {
    expect(formatUsPhone("abc")).toBe("");
    expect(formatUsPhone("6a5b1")).toBe("(651");
  });

  it("lets a backspace past the closing bracket remove a digit cleanly", () => {
    expect(formatUsPhone("(651)")).toBe("(651");
    expect(formatUsPhone("(65")).toBe("(65");
  });
});

describe("caretInFormatted", () => {
  it("keeps the caret after the same digit when a middle digit is deleted", () => {
    const raw = "(651) 55-0123";
    const formatted = formatUsPhone(raw);
    expect(formatted).toBe("(651) 550-123");
    expect(caretInFormatted(raw, 8, formatted)).toBe(8);
  });

  it("keeps the caret after the same digit when a digit is inserted", () => {
    const raw = "(6519) 555-012";
    const formatted = formatUsPhone(raw);
    expect(formatted).toBe("(651) 955-5012");
    expect(caretInFormatted(raw, 5, formatted)).toBe(7);
  });

  it("ignores a leading country code when counting digits", () => {
    const raw = "1 651 555 0123";
    const formatted = formatUsPhone(raw);
    expect(caretInFormatted(raw, 5, formatted)).toBe(4);
  });

  it("puts the caret just inside the bracket when no digits come before it", () => {
    expect(caretInFormatted("(651) 555", 0, "(651) 555")).toBe(1);
    expect(caretInFormatted("", 0, "")).toBe(0);
  });
});
