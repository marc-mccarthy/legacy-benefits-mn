import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Scheme = "light" | "muted" | "dark";

export type Signature = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7";

const SIGNATURE_SCHEME: Record<Signature, Scheme | null> = {
  F1: "dark",
  F2: "dark",
  F3: "light",
  F4: null,
  F5: "light",
  F6: "light",
  F7: "dark",
};

const SIGNATURE_PADDING: Partial<Record<Signature, string>> = {
  F3: "py-(--spacing-large) md:py-(--spacing-big)",
  F4: "py-(--spacing-large) md:py-(--spacing-big)",
  F5: "py-(--spacing-medium) md:py-(--spacing-medium)",
  F6: "py-(--spacing-medium) md:py-(--spacing-large)",
  F7: "py-(--spacing-big) md:py-(--spacing-huge)",
};

type SectionProps = {
  children: ReactNode;
  signature?: Signature;
  scheme?: Scheme;
  className?: string;
  as?: "section" | "div";
  id?: string;
  "aria-labelledby"?: string;
};

export function Section({
  children,
  signature,
  scheme,
  className,
  as: Tag = "section",
  ...rest
}: SectionProps) {
  const resolvedScheme =
    (signature ? SIGNATURE_SCHEME[signature] : null) ?? scheme ?? "light";

  const padding = signature
    ? SIGNATURE_PADDING[signature]
    : "py-(--spacing-large) md:py-(--spacing-big)";

  return (
    <Tag
      data-scheme={resolvedScheme}
      data-band=""
      data-signature={signature}
      className={cn("bg-surface text-on-surface", padding, className)}
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

export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("max-w-[65ch]", className)}>{children}</div>;
}
