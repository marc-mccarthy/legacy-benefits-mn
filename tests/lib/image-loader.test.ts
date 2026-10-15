import { describe, expect, it } from "vitest";
import imageLoader, { indexBySource, srcSetFor } from "@/lib/image-loader";
import { media } from "@/content/media";

const withDerivatives = Object.values(media).find(
  (asset) => asset.srcSet.length > 0,
)!;
const src = withDerivatives.src;

describe("an exact width", () => {
  it.each([480, 900, 1920])("maps %i to the derivative of that width", (w) => {
    const result = imageLoader({ src, width: w });

    expect(result).toContain(`-${w}.`);
    expect(
      withDerivatives.srcSet.some((variant) => variant.src === result),
    ).toBe(true);
  });
});

describe("a width between derivatives", () => {
  it("maps 481 up to 900, never down to 480", () => {
    expect(imageLoader({ src, width: 481 })).toContain("-900.");
  });

  it("maps 901 up to 1920", () => {
    expect(imageLoader({ src, width: 901 })).toContain("-1920.");
  });

  it("maps a width below the smallest derivative to the smallest", () => {
    expect(imageLoader({ src, width: 16 })).toContain("-480.");
  });

  it("never returns a derivative narrower than the request", () => {
    for (const width of [1, 100, 480, 481, 700, 900, 901, 1500, 1920]) {
      const result = imageLoader({ src, width });
      const chosen = withDerivatives.srcSet.find((v) => v.src === result);
      expect(chosen!.width, `width ${width}`).toBeGreaterThanOrEqual(
        Math.min(width, 1920),
      );
    }
  });
});

describe("a width above every derivative", () => {
  it("returns the largest rather than failing", () => {
    expect(imageLoader({ src, width: 4000 })).toContain("-1920.");
  });
});

describe("a source with no derivative", () => {
  it("returns an unknown src unchanged", () => {
    expect(imageLoader({ src: "/media/not-a-slot.jpg", width: 900 })).toBe(
      "/media/not-a-slot.jpg",
    );
  });

  it("leaves a non-media path alone", () => {
    expect(imageLoader({ src: "/video/hero-bg-poster.jpg", width: 480 })).toBe(
      "/video/hero-bg-poster.jpg",
    );
  });
});

describe("every slot the site can ask for", () => {
  it("resolves to a path the slot lists", () => {
    for (const [slot, asset] of Object.entries(media)) {
      for (const width of [480, 900, 1920]) {
        const result = imageLoader({ src: asset.src, width });
        const known =
          result === asset.src ||
          asset.srcSet.some((variant) => variant.src === result);
        expect(known, `${slot} at ${width} produced ${result}`).toBe(true);
      }
    }
  });

  it("ignores quality, which a static export cannot honour", () => {
    expect(imageLoader({ src, width: 900, quality: 50 })).toBe(
      imageLoader({ src, width: 900, quality: 100 }),
    );
  });
});

describe("the variant chosen at each declared width", () => {
  it("keeps AVIF where AVIF is the smaller file", () => {
    const index = indexBySource([
      {
        src: "/media/synthetic.jpg",
        srcSet: [
          { width: 900, src: "/media/synthetic-900.avif", bytes: 1000 },
          { width: 900, src: "/media/synthetic-900.webp", bytes: 4000 },
        ],
      },
    ]);

    expect(index.get("/media/synthetic.jpg")).toEqual([
      { width: 900, src: "/media/synthetic-900.avif", bytes: 1000 },
    ]);
  });

  it("holds the width for the first variant when two measure the same", () => {
    const index = indexBySource([
      {
        src: "/media/tied.jpg",
        srcSet: [
          { width: 480, src: "/media/tied-480.avif", bytes: 2048 },
          { width: 480, src: "/media/tied-480.webp", bytes: 2048 },
        ],
      },
    ]);

    expect(index.get("/media/tied.jpg")?.[0]?.src).toBe("/media/tied-480.avif");
  });
});

describe("the srcset a slot advertises", () => {
  it("lists each real width once, by its true width", () => {
    expect(srcSetFor(media["nate.duotone"].src)).toBe(
      "/media/nate-duotone-480.webp 480w, /media/nate-duotone-651.webp 651w",
    );
  });

  it("is absent for a source with no derivative", () => {
    expect(srcSetFor(media["nate.chip"].src)).toBeUndefined();
  });

  it("never claims a width a file does not have", () => {
    for (const [slot, asset] of Object.entries(media)) {
      for (const entry of srcSetFor(asset.src)?.split(", ") ?? []) {
        const [src, descriptor] = entry.split(" ");
        const variant = asset.srcSet.find((v) => v.src === src);
        expect(`${variant?.width}w`, `${slot}: ${entry}`).toBe(descriptor);
      }
    }
  });
});
