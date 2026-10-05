import { describe, expect, it } from "vitest";
import { media } from "@/content/media";
import { PIECES } from "@/components/sections/noise-field";

describe("the noise field", () => {
  it("layers ten to fourteen paper pieces", () => {
    expect(PIECES.length).toBeGreaterThanOrEqual(10);
    expect(PIECES.length).toBeLessThanOrEqual(14);
  });

  it("uses all six photographic cut-outs", () => {
    expect(new Set(PIECES.map((piece) => piece.paper))).toEqual(
      new Set(["01", "02", "06", "08", "09", "10"]),
    );
  });

  it("serves each cut-out as WebP with a PNG fallback", () => {
    for (const { paper } of PIECES) {
      const asset = media[`noise.paper${paper}`];
      expect(asset?.src).toBe(`/media/paper/paper-${paper}.png`);
      expect(asset?.srcSet.map((variant) => variant.src)).toEqual([
        `/media/paper/paper-${paper}.webp`,
      ]);
    }
  });

  it("mixes far and near depths", () => {
    const far = PIECES.filter((piece) => piece.far);
    expect(far.length).toBeGreaterThan(0);
    expect(far.length).toBeLessThan(PIECES.length);
    for (const piece of far) expect(piece.depth).toBeLessThan(0.6);
  });
});
