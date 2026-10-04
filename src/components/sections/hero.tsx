"use client";

import { Image } from "@/components/ui/image";
import Link from "next/link";
import { useState } from "react";
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

const portrait = mediaProps(media["nate.duotone"]);

export function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  const [resolved, setResolved] = useState(false);

  return (
    <Section
      scheme="dark"
      data-hero=""
      className="relative isolate py-0 md:py-0"
    >
      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />

      <div className="bg-ground-dark relative -mt-(--header-stack) flex h-svh min-h-[36rem] flex-col overflow-hidden md:justify-end">
        <div
          data-hero-stage=""
          data-resolved={resolved}
          onAnimationEnd={() => setResolved(true)}
          className="relative mt-(--header-stack) mb-6 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,black_80%,transparent)] md:absolute md:top-(--header-stack) md:right-0 md:bottom-0 md:left-1/2 md:m-0 md:[mask-image:none] [&_canvas]:animate-[page-fade-out_var(--duration-stage)_var(--ease-fade)_var(--duration-converge)_both]"
        >
          <ThreeStage
            scene="signal-hero"
            active={!resolved}
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
                  className="portrait-feather h-full w-full object-contain object-bottom print:opacity-100! [:has(canvas)_&]:animate-[page-fade-in_var(--duration-stage)_var(--ease-fade)_var(--duration-converge)_both]"
                />
              ) : null
            }
          />
        </div>

        <Container className="relative pb-32 md:pb-24">
          <div
            data-hero-copy
            className="space-y-5 text-white md:max-w-[48%] md:space-y-6"
          >
            <h1 className="font-display text-(length:--text-display-hero) leading-none font-bold tracking-[-0.06em] text-balance [font-stretch:125%]">
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
    </Section>
  );
}
