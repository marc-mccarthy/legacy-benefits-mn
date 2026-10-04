import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { paletteColor } from "./palette";

const tokens: Record<string, string> = {
  "--color-star-gold": " #ffc000 ",
  "--color-blank": "  ",
};

beforeEach(() => {
  vi.stubGlobal("document", { documentElement: {} });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) => tokens[name] ?? "",
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("returns the trimmed value of a palette token", () => {
  expect(paletteColor("--color-star-gold")).toBe("#ffc000");
});

test.each(["--color-missing", "--color-blank"])(
  "throws naming %s when it is missing or blank",
  (token) => {
    expect(() => paletteColor(token)).toThrow(`palette: ${token} is not set`);
  },
);
