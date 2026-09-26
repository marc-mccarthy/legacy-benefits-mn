import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DURATION_HOUSE,
  DURATION_REVEAL,
  EASE_ENTER,
  EASE_QUINT,
} from "./motion";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

/** Reads the declared value of a custom property from the `:root` block. */
function customProperty(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`--${name} is not declared in globals.css`);
  return match[1].trim();
}

const DURATIONS: ReadonlyArray<readonly [string, number]> = [
  ["duration-reveal", DURATION_REVEAL],
  ["duration-house", DURATION_HOUSE],
];

const EASES: ReadonlyArray<
  readonly [string, readonly [number, number, number, number]]
> = [
  ["ease-enter", EASE_ENTER],
  ["ease-quint", EASE_QUINT],
];

const CSS_ONLY_DURATIONS: ReadonlyArray<readonly [string, string]> = [
  ["duration-state", "140ms"],
  ["duration-exit", "180ms"],
  ["duration-enter", "240ms"],
  ["duration-sheet", "220ms"],
  ["duration-morph", "400ms"],
  ["duration-stage", "900ms"],
];

const CSS_ONLY_EASES: ReadonlyArray<readonly [string, string]> = [
  ["ease-exit", "cubic-bezier(0.4, 0, 1, 1)"],
  ["ease-move", "cubic-bezier(0.4, 0, 0.2, 1)"],
  ["ease-quart", "cubic-bezier(0.165, 0.84, 0.44, 1)"],
];

describe("motion tokens match globals.css", () => {
  it.each(DURATIONS)("--%s is %ims", (name, ms) => {
    expect(customProperty(name)).toBe(`${ms}ms`);
  });

  it.each(EASES)("--%s is the same curve", (name, curve) => {
    expect(customProperty(name)).toBe(`cubic-bezier(${curve.join(", ")})`);
  });
});

describe("motion tokens with no TypeScript twin", () => {
  it.each(CSS_ONLY_DURATIONS)("--%s is %s", (name, value) => {
    expect(customProperty(name)).toBe(value);
  });

  it.each(CSS_ONLY_EASES)("--%s is %s", (name, value) => {
    expect(customProperty(name)).toBe(value);
  });
});

describe("motion token shapes", () => {
  it("states every duration in whole milliseconds", () => {
    for (const [, ms] of DURATIONS) {
      expect(Number.isInteger(ms)).toBe(true);
      expect(ms).toBeGreaterThan(0);
    }
  });

  it("keeps easing control points in the range cubic-bezier accepts", () => {
    // x must sit in [0,1] or the curve is not a function of time; y may
    // overshoot, which is what EASE_ENTER does to land past its target.
    for (const [, [x1, , x2]] of EASES) {
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(1);
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(1);
    }
  });
});
