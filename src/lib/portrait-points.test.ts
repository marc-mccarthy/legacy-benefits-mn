import { describe, expect, it } from "vitest";
import {
  luminance,
  samplePortraitPoints,
  stipplePortrait,
} from "./portrait-points";

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

function rgba(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set(pixel(x, y), (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

describe("luminance", () => {
  const image = rgba(2, 2, (x, y) =>
    x === 0 && y === 0 ? [255, 255, 255, 255] : [0, 0, 255, 255],
  );

  it("reads Rec. 709 luminance at the pixel under a -1..1 point", () => {
    expect(luminance(image, -1, 1)).toBeCloseTo(1, 6);
    expect(luminance(image, 0.5, -0.5)).toBeCloseTo(0.0722, 6);
  });

  it("clamps the right and bottom edges to the last pixel", () => {
    expect(luminance(image, 1, -1)).toBeCloseTo(0.0722, 6);
  });
});

describe("stipplePortrait", () => {
  const halfLit = rgba(8, 8, (x) =>
    x < 4 ? [255, 255, 255, 255] : [0, 0, 0, 255],
  );

  it("returns count points and a brightness per point", () => {
    const { points, lum } = stipplePortrait(halfLit, 200, 3);
    expect(points).toHaveLength(400);
    expect(lum).toHaveLength(200);
    for (const value of lum) {
      expect(value).toBeGreaterThanOrEqual(0.2);
      expect(value).toBeLessThanOrEqual(1.15);
    }
  });

  it("favours bright pixels", () => {
    const { points } = stipplePortrait(halfLit, 200, 3);
    const lit = points.filter((value, i) => i % 2 === 0 && value < 0).length;
    expect(lit).toBeGreaterThan(150);
  });

  it("fills up with dark points when bright ones run out", () => {
    const dark = rgba(4, 4, () => [0, 0, 0, 255]);
    const { lum } = stipplePortrait(dark, 50, 3);
    expect(Array.from(lum)).toEqual(new Array(50).fill(0.2).map(Math.fround));
  });

  it("is the same for a seed and differs between seeds", () => {
    const a = stipplePortrait(halfLit, 100, 3);
    expect(stipplePortrait(halfLit, 100, 3)).toEqual(a);
    expect(stipplePortrait(halfLit, 100, 4).points).not.toEqual(a.points);
  });
});
