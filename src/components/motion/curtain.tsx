"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { DURATION_REVEAL, EASE_MOVE } from "@/lib/motion";

type CurtainProps = {
  children: ReactNode;
  className?: string;
};

export function Curtain({ children, className }: CurtainProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      data-reveal
      data-curtain
      className={className}
      initial={reduced ? false : { clipPath: "inset(0 0 100% 0)" }}
      whileInView={reduced ? undefined : { clipPath: "inset(0 0 0 0)" }}
      viewport={{ once: true, margin: "0px 0px 15% 0px" }}
      transition={{ duration: DURATION_REVEAL / 1000, ease: EASE_MOVE }}
    >
      {children}
    </motion.div>
  );
}
