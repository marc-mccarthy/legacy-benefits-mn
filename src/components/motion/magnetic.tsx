"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

import { useEffectsPaused } from "@/lib/effects-pause";
import { magnetPull } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SPRING = { stiffness: 260, damping: 18, mass: 0.6 };

export function Magnetic({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const paused = useEffectsPaused();
  const still = Boolean(useReducedMotion()) || paused;
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  function follow(event: PointerEvent<HTMLSpanElement>) {
    if (still || event.pointerType !== "mouse") return;
    const pull = magnetPull(
      { x: event.clientX, y: event.clientY },
      event.currentTarget.getBoundingClientRect(),
    );
    x.set(pull.x);
    y.set(pull.y);
  }

  function release() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      data-magnetic=""
      className={cn("inline-flex", className)}
      style={still ? undefined : { x, y }}
      onPointerMove={follow}
      onPointerLeave={release}
    >
      {children}
    </motion.span>
  );
}
