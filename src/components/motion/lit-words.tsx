"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";

import { useEffectsPaused } from "@/lib/effects-pause";
import { DURATION_REVEAL, EASE_MOVE } from "@/lib/motion";

type LitWordsProps = {
  children: string;
  className?: string;
};

export function LitWords({ children, className }: LitWordsProps) {
  const paused = useEffectsPaused();
  const reduced = useReducedMotion() || paused;
  const ref = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.35"],
  });

  const isWord = (part: string) => part.trim() !== "";
  const parts = children.split(/(\s+)/);
  const wordCount = parts.filter(isWord).length;

  return (
    <p ref={ref} className={className} data-lit-words>
      {parts.map((part, index) =>
        isWord(part) ? (
          <Word
            key={index}
            word={part}
            index={parts.slice(0, index).filter(isWord).length}
            total={wordCount}
            progress={scrollYProgress}
            reduced={Boolean(reduced)}
          />
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Word({
  word,
  index,
  total,
  progress,
  reduced,
}: {
  word: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduced: boolean;
}) {
  const start = total <= 1 ? 0 : (index / total) * 0.6;
  const opacity = useTransform(progress, [start, start + 0.4], [0, 1]);

  return (
    <span className="relative inline-block">
      <span className="text-muted">{word}</span>
      <motion.span
        aria-hidden
        data-lit-word
        className="text-on-surface absolute inset-0"
        style={reduced ? { opacity: 1 } : { opacity }}
        transition={{ duration: DURATION_REVEAL / 1000, ease: EASE_MOVE }}
      >
        {word}
      </motion.span>
    </span>
  );
}
