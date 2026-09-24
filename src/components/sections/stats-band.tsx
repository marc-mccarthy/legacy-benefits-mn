"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Container, Section, type Scheme } from "@/components/ui/section";

export type Stat = { value: number; suffix?: string | null; label: string };

function CountUp({ value, suffix }: { value: number; suffix?: string | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced || !inView) return;

    const duration = 1200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString("en-US")}
      {suffix ?? ""}
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
        <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display tabular block text-4xl md:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} />
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
