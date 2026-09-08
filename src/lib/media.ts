type MediaLike =
  | {
      url?: string | null;
      alt?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | number
  | null
  | undefined;

/** Payload relationships come back as an id or a populated doc depending on
 *  depth; normalise both so components never branch on it. */
export function mediaProps(media: MediaLike) {
  if (!media || typeof media === "number") return null;
  if (!media.url) return null;
  return {
    src: media.url,
    alt: media.alt ?? "",
    width: media.width ?? 1600,
    height: media.height ?? 900,
  };
}
