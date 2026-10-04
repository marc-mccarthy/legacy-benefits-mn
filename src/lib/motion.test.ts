import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DURATION_HOUSE,
  DURATION_REVEAL,
  EASE_FADE,
  EASE_MOVE,
} from "./motion";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

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
  ["ease-move", EASE_MOVE],
  ["ease-fade", EASE_FADE],
];

const CSS_ONLY_DURATIONS: ReadonlyArray<readonly [string, string]> = [
  ["duration-fast", "200ms"],
  ["duration-state", "140ms"],
  ["duration-exit", "180ms"],
  ["duration-enter", "240ms"],
  ["duration-sheet", "220ms"],
  ["duration-morph", "400ms"],
  ["duration-stage", "900ms"],
];

const REMOVED_TOKENS = ["ease-quart", "ease-quint", "ease-enter", "ease-exit"];

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

  it.each(REMOVED_TOKENS)("--%s is absent", (name) => {
    expect(css).not.toMatch(new RegExp(`--${name}:`));
  });

  it("caps display type at 11.5rem", () => {
    expect(customProperty("text-display-xl")).toBe(
      "clamp(3.5rem, 0.5rem + 12vw, 11.5rem)",
    );
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
    for (const [, [x1, , x2]] of EASES) {
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(1);
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(1);
    }
  });
});
