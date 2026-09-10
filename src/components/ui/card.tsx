import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // `relative` anchors the full-card link overlay used by card grids.
        // `group` lets a child react to hover on the whole card.
        "group relative flex flex-col overflow-hidden rounded-(--radius-card)",
        // Elevation is declared ONCE, as shadow. A hairline border under a
        // soft shadow is the ghost-card look — pick one system and commit.
        // The resting shadow matters more than the hover one: the cue that a
        // card is interactive has to be there before the pointer arrives, and
        // touch users never get hover at all.
        "bg-surface shadow-(--shadow-resting)",
        // Tailwind v4 already wraps a bare `hover:` in `@media (hover: hover)`,
        // so a plain touchscreen is covered. `pointer-fine` adds the second
        // half of the guard for hybrids — a touchscreen laptop, or a tablet
        // with a stylus, reports hover support while the finger doing the
        // tapping is still a coarse pointer. There the tap sticks the card in
        // its lifted state until something else is tapped, which reads as
        // "selected" on a grid where nothing is.
        "transition duration-200",
        "pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-(--shadow-lifted)",
        "motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-3 p-6", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-on-surface/85 text-surface inline-flex w-fit items-center rounded-md px-3 py-1 text-sm font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
