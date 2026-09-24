"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";

export function HeroParallax({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      data-hero-parallax
      className="absolute inset-x-0 -inset-y-[12%] -z-10"
      style={reduced ? undefined : { y }}
    >
      {children}
    </motion.div>
  );
}
