"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { useEffectsPaused } from "@/lib/effects-pause";
import { DURATION_CONVERGE, EASE_MOVE } from "@/lib/motion";

export type Stat = {
  value: number;
  suffix?: string | null;
  label: string;
  year?: boolean;
};

const formatStat = (value: number, suffix?: string | null) =>
  `${Math.round(value).toLocaleString("en-US")}${suffix ?? ""}`;

const formatFigure = (stat: Stat) =>
  stat.year
    ? `${stat.value}${stat.suffix ?? ""}`
    : formatStat(stat.value, stat.suffix);

function CountUp({ value, suffix }: { value: number; suffix?: string | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const paused = useEffectsPaused();

  useEffect(() => {
    const node = ref.current;
    if (!node || done.current) return;
    if (reduced || paused) {
      node.textContent = formatStat(value, suffix);
      return;
    }
    if (!inView) {
      node.textContent = formatStat(0, suffix);
      return;
    }
    const controls = animate(0, value, {
      duration: DURATION_CONVERGE / 1000,
      ease: EASE_MOVE,
      onUpdate: (latest) => {
        node.textContent = formatStat(latest, suffix);
      },
      onComplete: () => {
        done.current = true;
      },
    });
    return () => controls.stop();
  }, [inView, reduced, paused, value, suffix]);

  return (
    <span ref={ref} aria-hidden data-count-up="">
      {formatStat(value, suffix)}
    </span>
  );
}

export function StatsBand({
  stats,
  scheme = "muted",
}: {
  stats: Stat[];
  scheme?: Scheme;
}) {
  if (stats.length === 0) return null;

  return (
    <Section
      scheme={scheme}
      className="py-(--spacing-medium) md:py-(--spacing-large)"
    >
      <Container>
        <dl
          className={`grid gap-8 sm:grid-cols-2 ${stats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display tabular block text-4xl md:text-5xl">
                  {stat.year ? (
                    <span aria-hidden>{formatFigure(stat)}</span>
                  ) : (
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  )}
                  <span className="sr-only">{formatFigure(stat)}</span>
                </span>
                <span aria-hidden className="text-muted mt-2 block">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}
