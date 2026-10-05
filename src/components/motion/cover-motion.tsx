"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useRef } from "react";
import { useVisualEffectLifecycle } from "./use-visual-effect-lifecycle";

export function CoverMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, reduced, paused } = useVisualEffectLifecycle(ref);
  const moving = mounted && !reduced && !paused;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  const scale = useTransform(scrollYProgress, [0, 0.45], [1.32, 1.16]);

  return (
    <div ref={ref} data-cover-motion="" className="size-full">
      <motion.div
        style={moving ? { y, scale } : undefined}
        className="size-full print:transform-none!"
      >
        <div className="size-full transition-transform duration-700 ease-(--ease-move) motion-safe:group-focus-within:scale-[1.07] motion-safe:group-hover:scale-[1.07]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
