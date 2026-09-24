import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-action text-on-action hover:brightness-110",
  secondary:
    "border border-border-control bg-transparent text-on-surface hover:bg-on-surface/5",
  ghost: "bg-transparent text-on-surface underline underline-offset-4",
};

const sizes: Record<Size, string> = {
  sm: "h-11 px-4 text-base",
  md: "h-11 px-6 text-base",
  lg: "h-13 px-8 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-semibold tracking-wide transition",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
