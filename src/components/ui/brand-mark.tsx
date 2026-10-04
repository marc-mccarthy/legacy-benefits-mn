export function BrandMark() {
  return (
    <svg
      viewBox="18 10 77 77"
      aria-hidden
      data-brand-mark
      className="size-[1em] shrink-0"
    >
      <path
        d="M25,20 L25,80 L80,80"
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        data-star
        d="M70,10 L75,30 L95,35 L75,40 L70,60 L65,40 L50,35 L65,30 Z"
        fill="var(--color-star-gold)"
      />
    </svg>
  );
}

const wordmark =
  "min-w-0 font-(family-name:--font-display) font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]";

export function BrandLockup({ name }: { name: string }) {
  if (/^l/i.test(name)) {
    return (
      <span
        data-brand-lockup
        role="img"
        aria-label={name}
        className="inline-flex min-w-0 items-baseline text-xl leading-tight sm:text-2xl"
      >
        <BrandMark />
        <span className={`${wordmark} ml-[-0.06em]`}>{name.slice(1)}</span>
      </span>
    );
  }
  return (
    <span
      data-brand-lockup
      className="inline-flex min-w-0 items-baseline gap-1.5 text-xl leading-tight sm:text-2xl"
    >
      <BrandMark />
      <span className={wordmark}>{name}</span>
    </span>
  );
}
