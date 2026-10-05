type MediaLike =
  | {
      src?: string | null;
      url?: string | null;
      alt?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | number
  | null
  | undefined;

export function mediaProps(media: MediaLike) {
  if (!media || typeof media === "number") return null;
  const src = media.src ?? media.url;
  if (!src) return null;
  return {
    src,
    alt: media.alt ?? "",
    width: media.width ?? 1600,
    height: media.height ?? 900,
  };
}
