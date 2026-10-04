export function BrandMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      data-brand-mark
      className="size-8 shrink-0"
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

export function BrandLockup({ name }: { name: string }) {
  return (
    <span data-brand-lockup className="inline-flex min-w-0 items-center gap-2">
      <BrandMark />
      <span className="min-w-0 font-(family-name:--font-display) text-base leading-tight font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-lg">
        {name}
      </span>
    </span>
  );
}
