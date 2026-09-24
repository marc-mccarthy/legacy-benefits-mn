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
      data-card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-(--radius-card)",
        "bg-surface shadow-(--shadow-resting)",
        "transition duration-200",
        "pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-(--shadow-lifted)",
        "motion-reduce:translate-none motion-reduce:transform-none motion-reduce:transition-none",
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
        "bg-on-surface/85 text-surface inline-flex w-fit items-center rounded-md px-3 py-1 text-base font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
