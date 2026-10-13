import { describe, expect, it } from "vitest";
import { cn, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("rounded", "border")).toBe("rounded border");
  });

  it("resolves conflicting tailwind utilities in favour of the last", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("lets a shorthand override a longhand", () => {
    expect(cn("px-2", "p-4")).toBe("p-4");
  });

  it("keeps utilities that do not conflict", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it.each([
    ["false", false],
    ["null", null],
    ["undefined", undefined],
  ])("drops a %s entry", (_label, value) => {
    expect(cn("base", value, "end")).toBe("base end");
  });

  it("supports conditional object syntax", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", "c"]])).toBe("a b c");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("returns an empty string when everything is falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats a Date as a short US date", () => {
    expect(formatDate(new Date("2026-09-08T19:30:00Z"))).toBe("Sep 8, 2026");
  });

  it("accepts an ISO string", () => {
    expect(formatDate("2026-09-08T19:30:00Z")).toBe("Sep 8, 2026");
  });

  it("renders the date in the agency's timezone, not UTC", () => {
    expect(formatDate("2026-09-08T02:00:00Z")).toBe("Sep 7, 2026");
  });

  it("handles a date-only string as UTC midnight", () => {
    expect(formatDate("2026-09-08")).toBe("Sep 7, 2026");
  });

  it("accepts option overrides", () => {
    expect(formatDate("2026-09-08T19:30:00Z", { month: "long" })).toBe(
      "September 8, 2026",
    );
  });

  it("can add parts the default omits", () => {
    expect(formatDate("2026-09-08T19:30:00Z", { weekday: "long" })).toContain(
      "Tuesday",
    );
  });

  it("allows the timezone itself to be overridden", () => {
    expect(formatDate("2026-09-08T02:00:00Z", { timeZone: "UTC" })).toBe(
      "Sep 8, 2026",
    );
  });

  it("keeps the default fields when given an unrelated option", () => {
    expect(formatDate("2026-09-08T19:30:00Z", { weekday: "short" })).toContain(
      "2026",
    );
  });
});
