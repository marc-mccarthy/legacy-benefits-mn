import { cn } from "@/lib/utils";

/**
 * Initials placeholder for anyone without a photograph.
 *
 * The rule this exists to enforce: never mix illustration with photography on
 * the team or testimonial sections. A cartoon avatar beside a real headshot
 * reads as a stock template, and on a Medicare site that specific look is what
 * fraudulent operators use — the FBI's elder-fraud reporting describes those
 * sites as having "professional design, stock photos of happy seniors, fake
 * testimonials". Initials are honestly a placeholder and claim nothing.
 */

/** First and last initial. "Nate Van Der Berg" gives NV, not NVDB. */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /\p{L}/u.test(p));
  if (parts.length === 0) return "?";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return (
    // Intl-safe: [...str][0] takes a full code point, so a name starting with
    // an astral character (or an accented letter) is not sliced in half.
    (([...first][0] ?? "") + ([...last][0] ?? "")).toUpperCase()
  );
}

export function Monogram({
  name,
  className,
  /** Tailwind text size for the initials. Defaults suit a 48px avatar. */
  textClassName = "text-lg",
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      // Decorative: the person's name is always rendered as text next to this,
      // so announcing the initials again would just be repetition.
      aria-hidden
      className={cn(
        "bg-navy-800 grid shrink-0 place-items-center font-semibold text-white",
        className,
      )}
    >
      <span className={cn("tracking-wide", textClassName)}>
        {initialsOf(name)}
      </span>
    </span>
  );
}
