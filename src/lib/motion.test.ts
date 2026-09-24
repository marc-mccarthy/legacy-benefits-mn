import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DURATION_ENTER,
  DURATION_EXIT,
  DURATION_MORPH,
  DURATION_REVEAL,
  DURATION_SHEET,
  DURATION_STATE,
  EASE_ENTER,
  EASE_EXIT,
  EASE_MOVE,
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
  ["duration-state", DURATION_STATE],
  ["duration-exit", DURATION_EXIT],
  ["duration-enter", DURATION_ENTER],
  ["duration-sheet", DURATION_SHEET],
  ["duration-reveal", DURATION_REVEAL],
  ["duration-morph", DURATION_MORPH],
];

const EASES: ReadonlyArray<
  readonly [string, readonly [number, number, number, number]]
> = [
  ["ease-enter", EASE_ENTER],
  ["ease-exit", EASE_EXIT],
  ["ease-move", EASE_MOVE],
];

describe("motion tokens match globals.css", () => {
  it.each(DURATIONS)("--%s is %ims", (name, ms) => {
    expect(customProperty(name)).toBe(`${ms}ms`);
  });

  it.each(EASES)("--%s is the same curve", (name, curve) => {
    expect(customProperty(name)).toBe(`cubic-bezier(${curve.join(", ")})`);
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
