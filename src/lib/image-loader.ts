import { media } from "@/content/media";

/**
 * Maps a request for a width onto a derivative that exists on disk.
 *
 * `output: "export"` ships no image optimiser, so every width `next/image`
 * asks for has to resolve to a file already in `public/media/`. The smallest
 * derivative at or above the requested width is chosen, so an image is scaled
 * down by the browser and never up. A source with no derivatives — the two
 * avatar slots in `media-manifest.json` — returns unchanged.
 */

type Derivative = { width: number; src: string };

const BY_SOURCE: Map<string, Derivative[]> = (() => {
  const index = new Map<string, Derivative[]>();

  for (const asset of Object.values(media)) {
    if (asset.srcSet.length === 0) continue;

    // One format per width, so a single `src` attribute stays deterministic.
    // AVIF is preferred where both exist; `<picture>` is what negotiates
    // formats, and this loader only ever fills `src` and `srcSet`.
    const byWidth = new Map<number, Derivative>();
    for (const variant of asset.srcSet) {
      const existing = byWidth.get(variant.width);
      if (!existing || variant.format === "avif") {
        byWidth.set(variant.width, { width: variant.width, src: variant.src });
      }
    }

    index.set(
      asset.src,
      [...byWidth.values()].sort((a, b) => a.width - b.width),
    );
  }

  return index;
})();

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const derivatives = BY_SOURCE.get(src);
  if (!derivatives || derivatives.length === 0) return src;

  const match = derivatives.find((derivative) => derivative.width >= width);
  return (match ?? derivatives[derivatives.length - 1]).src;
}
