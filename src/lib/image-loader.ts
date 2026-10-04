import { media } from "@/content/media";

type Derivative = { width: number; src: string; bytes: number };

type Indexable = {
  src: string;
  srcSet: { width: number; src: string; bytes: number }[];
};

export function indexBySource(assets: Indexable[]): Map<string, Derivative[]> {
  const index = new Map<string, Derivative[]>();

  for (const asset of assets) {
    if (asset.srcSet.length === 0) continue;

    const byWidth = new Map<number, Derivative>();
    for (const variant of asset.srcSet) {
      const existing = byWidth.get(variant.width);
      if (!existing || variant.bytes < existing.bytes) {
        byWidth.set(variant.width, {
          width: variant.width,
          src: variant.src,
          bytes: variant.bytes,
        });
      }
    }

    index.set(
      asset.src,
      [...byWidth.values()].sort((a, b) => a.width - b.width),
    );
  }

  return index;
}

const BY_SOURCE = indexBySource(Object.values(media));

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const derivatives = BY_SOURCE.get(src);
  if (!derivatives) return src;

  const match = derivatives.find((derivative) => derivative.width >= width);
  return (match ?? derivatives[derivatives.length - 1]).src;
}

export function srcSetFor(src: string): string | undefined {
  return BY_SOURCE.get(src)
    ?.map((derivative) => `${derivative.src} ${derivative.width}w`)
    .join(", ");
}
