"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance travelled on entry, in pixels. Kept small deliberately. */
  distance?: number;
};

/**
 * Fade-and-rise on scroll — the restrained pattern measured on
 * mcgillpartners.com and greatwatersfinancial.com.
 *
 * Two safety rails, because the failure mode here is invisible content:
 *  - `useReducedMotion` renders a plain element with no opacity animation.
 *  - `data-reveal` is force-shown by a !important CSS rule under
 *    prefers-reduced-motion, which also covers the server-rendered markup
 *    before hydration decides anything.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 16,
}: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Reveals children in sequence. Index-based delay, capped so long lists
 *  do not leave the last card waiting seconds to appear. */
export function StaggerList({
  children,
  className,
  step = 0.08,
  max = 0.4,
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
  max?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={Math.min(i * step, max)}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
