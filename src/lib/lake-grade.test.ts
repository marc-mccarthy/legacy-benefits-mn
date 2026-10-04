import { describe, expect, it } from "vitest";
import { lakeGrade } from "./lake-grade";

describe("lakeGrade", () => {
  it("returns each calibrated key exactly", () => {
    expect(lakeGrade(0)).toEqual({
      exposure: 0.2,
      glowStrength: 0.25,
      stars: 0.35,
      dusk: 0.25,
    });
    expect(lakeGrade(0.35)).toEqual({
      exposure: 1,
      glowStrength: 0.3,
      stars: 0,
      dusk: 0,
    });
    expect(lakeGrade(0.7)).toEqual({
      exposure: 0.7,
      glowStrength: 0.9,
      stars: 0,
      dusk: 0.4,
    });
    expect(lakeGrade(1)).toEqual({
      exposure: 0.8,
      glowStrength: 0.4,
      stars: 1,
      dusk: 1,
    });
  });

  it("keeps the dusk exposure at or above its 0.8 floor", () => {
    expect(lakeGrade(1).exposure).toBeGreaterThanOrEqual(0.8);
  });

  it("interpolates linearly between keys", () => {
    const mid = lakeGrade(0.175);
    expect(mid.exposure).toBeCloseTo(0.6);
    expect(mid.glowStrength).toBeCloseTo(0.275);
    expect(mid.stars).toBeCloseTo(0.175);
    expect(mid.dusk).toBeCloseTo(0.125);
    expect(lakeGrade(0.85).dusk).toBeCloseTo(0.7);
    expect(lakeGrade(0.525).glowStrength).toBeCloseTo(0.6);
  });

  it("clamps out-of-range progress to the end keys", () => {
    expect(lakeGrade(-0.5)).toEqual(lakeGrade(0));
    expect(lakeGrade(1.5)).toEqual(lakeGrade(1));
  });

  it("treats non-finite progress as the nearest end", () => {
    expect(lakeGrade(Number.NaN)).toEqual(lakeGrade(0));
    expect(lakeGrade(Number.NEGATIVE_INFINITY)).toEqual(lakeGrade(0));
    expect(lakeGrade(Number.POSITIVE_INFINITY)).toEqual(lakeGrade(1));
  });

  it("keeps every output finite and within 0..1", () => {
    for (let i = 0; i <= 100; i += 1) {
      for (const value of Object.values(lakeGrade(i / 100))) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
