"use client";

import Image from "next/image";
import Link from "next/link";
import { type RefObject, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { ThreeStage } from "@/components/motion/three-stage";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { mediaProps } from "@/lib/media";

type HeroProps = {
  heading: string;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

const RESOLVE_AT = 0.85;

const portrait = mediaProps(media["nate.duotone"]);

function useHeroProgress(track: RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (value) =>
    setProgress(Math.round(value * 1000) / 1000),
  );
  return progress;
}

export function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useHeroProgress(trackRef);

  return (
    <Section
      scheme="dark"
      data-hero=""
      className="relative isolate py-0 md:py-0"
    >
      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />

      <div
        ref={trackRef}
        className="relative -mt-(--header-stack) print:h-auto! [@media(scripting:enabled)]:motion-safe:h-[200svh]"
      >
        <div className="sticky top-0 flex h-svh min-h-[36rem] flex-col overflow-hidden bg-[#081A3A] md:justify-end">
          <div
            data-hero-stage=""
            data-resolved={progress > RESOLVE_AT}
            className="relative mt-(--header-stack) mb-6 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,black_80%,transparent)] md:absolute md:top-[calc(var(--header-stack)/2)] md:right-0 md:bottom-0 md:left-1/2 md:m-0 md:[mask-image:none] [&_canvas]:transition-opacity [&_canvas]:duration-(--duration-stage) data-[resolved=true]:[&_canvas]:opacity-0"
          >
            <ThreeStage
              scene="signal-hero"
              progress={progress}
              className="absolute inset-0"
              fallback={
                portrait ? (
                  <Image
                    loading="eager"
                    fetchPriority="high"
                    src={portrait.src}
                    alt={portrait.alt}
                    width={portrait.width}
                    height={portrait.height}
                    sizes="(min-width: 768px) 40vw, 60vw"
                    className="h-full w-full object-contain object-bottom transition-opacity duration-(--duration-stage) print:opacity-100! print:transition-none [[data-resolved=false]:has(canvas)_&]:opacity-0"
                  />
                ) : null
              }
            />
          </div>

          <Container className="relative pb-32 md:pb-24">
            <div className="space-y-5 text-white md:max-w-[48%] md:space-y-6">
              <h1 className="font-display text-[clamp(3rem,8.5vw_-_0.5rem,5.75rem)] leading-none font-bold tracking-[-0.06em] text-balance [font-stretch:125%]">
                {heading}
              </h1>
              {subheading ? (
                <p className="lead max-w-xl text-base leading-relaxed text-white md:text-xl">
                  {subheading}
                </p>
              ) : null}
              {ctaHref && ctaLabel ? (
                <Button asChild size="lg">
                  <Link href={ctaHref}>{ctaLabel}</Link>
                </Button>
              ) : null}
            </div>
          </Container>
        </div>
      </div>
    </Section>
  );
}
