const SPRITE = "/media/logo/lbg-sprite.svg";

const TREES = { viewBox: "0 0 495.4 344.9", ratio: "495.4 / 344.9" };
const WORDMARK = { viewBox: "0 0 1977.9 495.6", ratio: "1977.9 / 495.6" };
const FULL = { viewBox: "0 0 1977.9 1267.9", ratio: "1977.9 / 1267.9" };

function Piece({
  id,
  shape,
  className,
  ...data
}: {
  id: string;
  shape: { viewBox: string; ratio: string };
  className: string;
  [key: `data-${string}`]: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={shape.viewBox}
      style={{ aspectRatio: shape.ratio }}
      className={className}
      {...data}
    >
      <use href={`${SPRITE}#${id}`} width="100%" height="100%" />
    </svg>
  );
}

export function BrandLockup({ name }: { name: string }) {
  return (
    <span
      data-brand-lockup
      className="inline-flex shrink-0 items-center gap-1.5 sm:gap-3"
    >
      <Piece
        id="trees"
        shape={TREES}
        data-brand-mark=""
        className="h-7 w-auto shrink-0 sm:h-11"
      />
      <Piece
        id="wordmark"
        shape={WORDMARK}
        data-brand-wordmark=""
        className="h-7 w-auto shrink-0 sm:h-10"
      />
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function BrandLogo({ name }: { name: string }) {
  return (
    <span data-brand-lockup className="relative block w-full max-w-[17rem]">
      <svg
        aria-hidden
        focusable="false"
        data-brand-logo=""
        viewBox={FULL.viewBox}
        style={{ aspectRatio: FULL.ratio }}
        className="block h-auto w-full"
      >
        <use href={`${SPRITE}#full`} width="100%" height="100%" />
        <use
          href={`${SPRITE}#full-arc`}
          width="100%"
          height="100%"
          className="text-star-gold"
        />
      </svg>
      <span className="sr-only">{name}</span>
    </span>
  );
}
