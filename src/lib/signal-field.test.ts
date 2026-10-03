import { describe, expect, it } from "vitest";
import { easeMove, fieldPositions, noisePositions } from "./signal-field";

const noise = new Float32Array([-1, -1, 0.5, 0.25]);
const target = new Float32Array([1, 1, -0.5, 0.75]);

function run(progress: number): Float32Array {
  const out = new Float32Array(noise.length);
  fieldPositions(noise, target, progress, out);
  return out;
}

describe("easeMove", () => {
  it("matches cubic-bezier(0.32, 0.72, 0, 1)", () => {
    expect(easeMove(0)).toBeCloseTo(0, 6);
    expect(easeMove(0.25)).toBeCloseTo(0.779131, 4);
    expect(easeMove(0.5)).toBeCloseTo(0.954809, 4);
    expect(easeMove(0.85)).toBeCloseTo(0.997552, 4);
    expect(easeMove(1)).toBeCloseTo(1, 6);
  });
});

describe("fieldPositions", () => {
  it("is the noise at progress 0", () => {
    expect(Array.from(run(0))).toEqual(Array.from(noise));
  });

  it("is the target at progress 1", () => {
    expect(Array.from(run(1))).toEqual(Array.from(target));
  });

  it("is the eased mix at progress 0.5", () => {
    const t = easeMove(0.5);
    const out = run(0.5);
    for (let i = 0; i < out.length; i += 1) {
      expect(out[i]).toBeCloseTo(noise[i] + (target[i] - noise[i]) * t, 5);
    }
  });

  it("clamps progress below 0 to the noise", () => {
    expect(Array.from(run(-1))).toEqual(Array.from(noise));
  });

  it("clamps progress above 1 to the target", () => {
    expect(Array.from(run(2))).toEqual(Array.from(target));
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
