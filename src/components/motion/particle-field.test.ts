import { describe, expect, it } from "vitest";
import { computePointCount } from "./particle-field";

describe("computePointCount", () => {
  it("returns 80 at 1440x600", () => {
    expect(computePointCount(1440, 600)).toBe(80);
  });

  it("returns 50 at 768x520", () => {
    expect(computePointCount(768, 520)).toBe(50);
  });

  it("returns 25 at 390x520", () => {
    expect(computePointCount(390, 520)).toBe(25);
  });

  it("returns 22 at 360x480", () => {
    expect(computePointCount(360, 480)).toBe(22);
  });

  it("returns 80 at 2560x1440", () => {
    expect(computePointCount(2560, 1440)).toBe(80);
  });

  it("returns 80 at 1440x900", () => {
    expect(computePointCount(1440, 900)).toBe(80);
  });
});
