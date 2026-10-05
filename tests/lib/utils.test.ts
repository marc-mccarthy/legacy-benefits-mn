import { describe, expect, it } from "vitest";
import { cn, formatDate, formatTime } from "@/lib/utils";

const spaces = (value: string) => value.replace(/\s/g, " ");

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

describe("formatTime", () => {
  it("formats a Date with a timezone label", () => {
    expect(spaces(formatTime(new Date("2026-09-08T19:30:00Z")))).toBe(
      "2:30 PM CDT",
    );
  });

  it("accepts an ISO string", () => {
    expect(spaces(formatTime("2026-09-08T19:30:00Z"))).toBe("2:30 PM CDT");
  });

  it("switches to standard time outside daylight saving", () => {
    expect(spaces(formatTime("2026-12-07T19:30:00Z"))).toBe("1:30 PM CST");
  });

  it("always names the zone so the reader can act on it", () => {
    expect(formatTime("2026-09-08T19:30:00Z")).toMatch(/C[DS]T$/);
  });

  it("pads the minutes", () => {
    expect(spaces(formatTime("2026-09-08T19:05:00Z"))).toBe("2:05 PM CDT");
  });

  it("does not pad the hour", () => {
    expect(spaces(formatTime("2026-09-08T14:00:00Z"))).toBe("9:00 AM CDT");
  });

  it("renders midnight and noon unambiguously", () => {
    expect(spaces(formatTime("2026-09-08T05:00:00Z"))).toBe("12:00 AM CDT");
    expect(spaces(formatTime("2026-09-08T17:00:00Z"))).toBe("12:00 PM CDT");
  });
});
