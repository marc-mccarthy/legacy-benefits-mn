"use client";

import { Image } from "@/components/ui/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ThreeStage } from "@/components/motion/three-stage";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
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
  const frameRef = useRef<HTMLDivElement>(null);
  const { mounted, reduced, paused } = useVisualEffectLifecycle(frameRef);
  const moving = mounted && !reduced && !paused;
  const { scrollY } = useScroll();
  const stageY = useTransform(scrollY, [0, 1000], [0, 160]);
  const copyY = useTransform(scrollY, [0, 1000], [0, -140]);

  return (
    <Section
      scheme="dark"
      data-hero=""
      className="relative isolate py-0 md:py-0"
    >
      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />

      <div
        ref={frameRef}
        className="bg-ground-dark relative -mt-(--header-stack) flex h-svh min-h-[36rem] flex-col overflow-hidden md:justify-end"
      >
        <motion.div
          data-hero-stage=""
          data-resolved={resolved}
          onAnimationEnd={() => setResolved(true)}
          style={moving ? { y: stageY } : undefined}
          className="relative mt-(--header-stack) mb-6 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,black_80%,transparent)] [--hero-hold:calc(var(--duration-converge)+var(--duration-stage))] md:absolute md:top-(--header-stack) md:right-0 md:bottom-0 md:left-1/2 md:m-0 md:[mask-image:none] print:transform-none! [&_canvas]:mix-blend-screen"
        >
          <ThreeStage
            scene="signal-hero"
            settled={resolved}
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
                  className="portrait-feather h-full w-full object-contain object-bottom print:opacity-100! [[data-resolved=false]>:has(>canvas)>&]:animate-[page-fade-in_var(--duration-stage)_var(--ease-fade)_var(--hero-hold)_both]"
                />
              ) : null
            }
          />
        </motion.div>

        <Container className="relative pb-32 md:pb-24">
          <motion.div
            data-hero-copy
            style={moving ? { y: copyY } : undefined}
            className="space-y-5 text-white md:max-w-[48%] md:space-y-6 print:transform-none!"
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
              <Magnetic>
                <Button asChild size="lg">
                  <Link href={ctaHref}>{ctaLabel}</Link>
                </Button>
              </Magnetic>
            ) : null}
          </motion.div>
        </Container>
      </div>
    </Section>
  );
}
