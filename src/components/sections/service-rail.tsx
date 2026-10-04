"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ThreeStage } from "@/components/motion/three-stage";
import { Container, Section, type Scheme } from "@/components/ui/section";
import type { ServiceItem } from "@/components/sections/service-grid";
import { media } from "@/content/media";

const PLAN_FIT = [
  {
    question: "Want one card for doctors, hospital and drugs?",
    slug: "medicare-advantage",
    plan: "Medicare Advantage",
  },
  {
    question:
      "Want to see any doctor that takes Medicare, with predictable costs?",
    slug: "medicare-supplement",
    plan: "Medicare Supplement",
  },
  {
    question: "Mainly worried about prescription costs?",
    slug: "part-d",
    plan: "Part D",
  },
];

const RAIL_ID = "services-rail";

const GLASS: Record<string, { key: string; still: string }> = {
  "medicare-advantage": { key: "knot", still: "glass.partC" },
  "medicare-supplement": { key: "shield", still: "glass.medigap" },
  "part-d": { key: "prism", still: "glass.partD" },
};

const arrowClass =
  "border-border-control inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border text-xl enabled:hover:border-accent disabled:opacity-40";

export function ServiceRail({
  heading,
  intro,
  services,
  scheme = "light",
}: {
  heading?: string | null;
  intro?: string | null;
  services: ServiceItem[];
  scheme?: Scheme;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const [overflows, setOverflows] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      setOverflows(rail.scrollWidth > rail.clientWidth);
      setAtStart(rail.scrollLeft <= 1);
      setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    rail.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", measure);
    };
  }, []);

  if (services.length === 0) return null;

  const step = (direction: 1 | -1) => {
    const rail = railRef.current;
    const card = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !card) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <Section scheme={scheme} aria-labelledby="services-heading">
      <Container className="max-w-2xl space-y-4 md:max-w-6xl">
        <h2
          id="services-heading"
          className="font-display text-(length:--text-display-lg)"
        >
          {heading ?? "How we help"}
        </h2>
        {intro ? <p className="lead max-w-2xl text-lg">{intro}</p> : null}

        <nav aria-label="Which plan fits you" className="max-w-2xl pt-4">
          <p className="font-semibold">Which sounds most like you?</p>
          <ul className="mt-3 space-y-3">
            {PLAN_FIT.map(({ question, slug, plan }) => (
              <li key={slug}>
                <a
                  href={`#${slug}`}
                  className="border-border-control hover:border-accent flex min-h-14 items-center justify-between gap-4 rounded-lg border px-4 py-2 text-lg"
                >
                  <span>
                    {question} <strong className="underline">{plan}</strong>
                  </span>
                  <span aria-hidden="true" className="text-accent text-2xl">
                    &rsaquo;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <ThreeStage
        scene="glass"
        fineOnly
        className="mt-(--spacing-medium)"
        fallback={
          <ul ref={railRef} id={RAIL_ID} data-rail="">
            {services.map((service) => {
              const glass = GLASS[service.slug];
              const still = glass ? media[glass.still] : null;
              return (
                <li
                  key={service.id}
                  id={service.slug}
                  data-rail-card=""
                  onFocus={(event) =>
                    event.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: reduced ? "auto" : "smooth",
                    })
                  }
                >
                  <div data-card-window={glass?.key ?? ""}>
                    {still ? (
                      <Image
                        data-card-still=""
                        src={still.src}
                        alt={still.alt}
                        fill
                        sizes="416px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-3 p-6">
                    <h3 className="text-(length:--text-display-md) leading-[1.2] font-semibold tracking-[-0.01em]">
                      {service.title}
                    </h3>
                    <p className="text-muted leading-relaxed text-pretty">
                      {service.summary}
                    </p>
                    <Link
                      href={`/services/${service.slug}`}
                      className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                    >
                      Learn more
                      <span className="sr-only"> about {service.title}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        }
      />

      <Container>
        {overflows ? (
          <div data-rail-controls="" className="mt-6 flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous plan"
              aria-controls={RAIL_ID}
              disabled={atStart}
              aria-disabled={atStart}
              onClick={() => step(-1)}
              className={arrowClass}
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <button
              type="button"
              aria-label="Next plan"
              aria-controls={RAIL_ID}
              disabled={atEnd}
              aria-disabled={atEnd}
              onClick={() => step(1)}
              className={arrowClass}
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
            <p className="text-muted">
              Swipe or use the arrows to see all three.
            </p>
          </div>
        ) : (
          <div aria-hidden className="mt-6 h-11" />
        )}
      </Container>
    </Section>
  );
}
