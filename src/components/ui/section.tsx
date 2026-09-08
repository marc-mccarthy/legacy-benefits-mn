import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Scheme = "light" | "muted" | "dark";

type SectionProps = {
  children: ReactNode;
  scheme?: Scheme;
  className?: string;
  /** Rendered as <section> by default; pass "div" for nested bands. */
  as?: "section" | "div";
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * A full-bleed band. `scheme` swaps the semantic token set for everything
 * inside via [data-scheme] (see globals.css), which is how the reference sites
 * alternate light and dark sections without per-section colour classes.
 */
export function Section({
  children,
  scheme = "light",
  className,
  as: Tag = "section",
  ...rest
}: SectionProps) {
  return (
    <Tag
      data-scheme={scheme}
      className={cn(
        "bg-surface text-on-surface py-(--spacing-large) md:py-(--spacing-big)",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 md:px-8", className)}>
      {children}
    </div>
  );
}

/** Narrow measure for body copy — roughly the 830px column used on McGill. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("max-w-[52rem]", className)}>{children}</div>;
}
