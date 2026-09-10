import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

/**
 * `primary` carries a border despite being a filled button.
 *
 * The gold fill measures 1.35:1 against the paper background — the label on it
 * is 10.56:1 and passes easily, which is why a text-contrast check misses this,
 * but WCAG 1.4.11 governs the control's own boundary and wants 3:1. With no
 * border the button's shape is conveyed by hue alone.
 *
 * That is the specific failure to avoid here. The lens yellows with age, which
 * degrades blue-yellow discrimination first, so "yellow against warm white" is
 * exactly the distinction this audience loses. The border restates the shape in
 * luminance, which survives it, and costs nothing visually at 1px.
 */
const variants: Record<Variant, string> = {
  primary:
    "border border-accent-edge bg-accent text-on-accent hover:brightness-95",
  secondary:
    "border border-border-control bg-transparent text-on-surface hover:bg-on-surface/5",
  ghost: "bg-transparent text-on-surface underline underline-offset-4",
};

/**
 * 44px is the floor, not the target — WCAG 2.5.8 permits 24px, but that leaves
 * no margin for a hand tremor, and this audience's measured dexterity scores
 * well below a younger one's. `sm` differs from `md` in horizontal padding
 * only, so a compact button is narrower but never shorter.
 *
 * The floor lives here rather than at each call site on purpose: `sm` was being
 * used for the header's primary CTA and both cookie-consent buttons, so a
 * per-call-site fix would have to be re-argued every time someone reaches for
 * the compact variant.
 *
 * Labels stay at 16px. A button label is read before it is pressed.
 */
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
        // Visible focus ring is a WCAG 2.2 requirement, not a preference.
        "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
