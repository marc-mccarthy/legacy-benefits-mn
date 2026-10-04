import { describe, expect, it } from "vitest";
import { seededRandom } from "@/lib/random";

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

  it("differs between seeds", () => {
    expect(seededRandom(9)()).not.toBe(seededRandom(10)());
  });
});
