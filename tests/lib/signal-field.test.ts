import { describe, expect, it } from "vitest";
import { easeMove, fieldPositions, noisePositions } from "@/lib/signal-field";

const noise = new Float32Array([-1, -1, 0.5, 0.25]);
const target = new Float32Array([1, 1, -0.5, 0.75]);

function run(t: number): Float32Array {
  const out = new Float32Array(noise.length);
  fieldPositions(noise, target, t, out);
  return out;
}

describe("easeMove", () => {
  it("follows cubic-bezier(0.32, 0.72, 0, 1)", () => {
    expect(easeMove(0)).toBe(0);
    expect(easeMove(0.25)).toBeCloseTo(0.779131, 3);
    expect(easeMove(0.5)).toBeCloseTo(0.954809, 3);
    expect(easeMove(0.85)).toBeCloseTo(0.997552, 3);
    expect(easeMove(1)).toBe(1);
  });
});

describe("fieldPositions", () => {
  it("is the noise at 0", () => {
    expect(Array.from(run(0))).toEqual(Array.from(noise));
  });

  it("is the target at 1", () => {
    expect(Array.from(run(1))).toEqual(Array.from(target));
  });

  it("mixes linearly in between, so the caller eases once", () => {
    const out = run(0.25);
    for (let i = 0; i < out.length; i += 1) {
      expect(out[i]).toBeCloseTo(noise[i] + (target[i] - noise[i]) * 0.25, 5);
    }
  });
});

describe("noisePositions", () => {
  it("returns count xy pairs in -1..1, the same for a seed", () => {
    const a = noisePositions(400, 5);
    expect(a).toHaveLength(800);
    for (const value of a) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThan(1);
    }
    expect(noisePositions(400, 5)).toEqual(a);
    expect(noisePositions(400, 6)).not.toEqual(a);
  });
});
