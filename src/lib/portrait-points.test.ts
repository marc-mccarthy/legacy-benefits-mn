import { describe, expect, it } from "vitest";
import { samplePortraitPoints, seededRandom } from "./portrait-points";

function ringAlpha(width: number, height: number): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = x >= 2 && x < 6 && y >= 3 && y < 9;
      alpha[y * width + x] = inside ? 255 : x === 0 ? 128 : 0;
    }
  }
  return alpha;
}

describe("samplePortraitPoints", () => {
  const width = 8;
  const height = 12;
  const alpha = ringAlpha(width, height);

  it("returns count xy pairs", () => {
    expect(samplePortraitPoints(alpha, width, height, 500, 7)).toHaveLength(
      1000,
    );
  });

  it("keeps every point inside -1..1", () => {
    const points = samplePortraitPoints(alpha, width, height, 500, 7);
    for (const value of points) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("places points only on pixels whose alpha is above 128", () => {
    const points = samplePortraitPoints(alpha, width, height, 500, 7);
    for (let i = 0; i < points.length; i += 2) {
      const px = Math.floor(((points[i] + 1) / 2) * width);
      const py = Math.floor(((1 - points[i + 1]) / 2) * height);
      expect(alpha[py * width + px]).toBeGreaterThan(128);
    }
  });

  it("spreads points across the whole opaque area", () => {
    const points = samplePortraitPoints(alpha, width, height, 2000, 7);
    const xs = points.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(-0.4);
    expect(Math.max(...xs)).toBeGreaterThan(0.4);
  });

  it("returns the same points for the same seed", () => {
    expect(samplePortraitPoints(alpha, width, height, 300, 42)).toEqual(
      samplePortraitPoints(alpha, width, height, 300, 42),
    );
  });

  it("returns different points for a different seed", () => {
    expect(samplePortraitPoints(alpha, width, height, 300, 42)).not.toEqual(
      samplePortraitPoints(alpha, width, height, 300, 43),
    );
  });

  it("throws when no pixel is opaque", () => {
    expect(() =>
      samplePortraitPoints(new Uint8ClampedArray(16), 4, 4, 10, 1),
    ).toThrow(/no opaque pixels/);
  });
});

describe("seededRandom", () => {
  it("yields values in 0..1 and repeats for a seed", () => {
    const a = seededRandom(9);
    const b = seededRandom(9);
    for (let i = 0; i < 100; i += 1) {
      const value = a();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(b()).toBe(value);
    }
  });
});
