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
  distance = 8,
}: RevealProps) {
  const reduced = useReducedMotion();

  // The element type stays the same whether or not motion is reduced.
  // `useReducedMotion` is false during server rendering, so branching to a
  // plain <div> here made the client replace the server's node on hydration —
  // anything holding a reference to it (a test, a focus target, an anchor
  // scroll) was left pointing at a detached element. Only the animation props
  // are gated.
  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduced ? false : { opacity: 0, y: distance }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      // A POSITIVE margin grows the trigger area, so the reveal starts before
      // the element scrolls fully into view and has finished by the time it is
      // read. The previous "-10%" shrank it, firing the animation later — a
      // careful scroller arrived at text that was still fading, and text at
      // partial opacity is unreadable for exactly the people with reduced
      // contrast sensitivity.
      viewport={{ once: true, margin: "0px 0px 15% 0px" }}
      // 320ms, not 600ms. Long enough to be perceived as motion rather than a
      // jump, short enough that nobody waits on it.
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
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
  step = 0.05,
  // Capped at 150ms total. A longer cascade means the last card in a row is
  // still arriving after the eye has already moved to it.
  max = 0.15,
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
