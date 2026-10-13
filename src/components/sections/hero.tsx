"use client";

import { Image } from "@/components/ui/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

const maze = mediaProps(media["hero.maze"]);
const mazeRun = media["hero.mazeRun"];
const mazeRunMobile = media["hero.mazeRunMobile"];

const reportUnlessAborted = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return;
  reportError(error);
};

export function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  const [resolved, setResolved] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLVideoElement>(null);
  const { mounted, reduced, paused, onscreen, tabVisible } =
    useVisualEffectLifecycle(frameRef);
  const moving = mounted && !reduced && !paused;
  const showRun = moving && resolved;
  const runPlaying = showRun && onscreen && tabVisible;

  useEffect(() => {
    const video = runRef.current;
    if (!video || video.ended) return;
    if (runPlaying) video.play().catch(reportUnlessAborted);
    else video.pause();
  }, [showRun, runPlaying]);

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
          className="bg-ground-dark relative mt-(--header-stack) mb-6 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,black_80%,transparent)] [--hero-hold:calc(var(--duration-converge)+var(--duration-stage))] md:absolute md:top-(--header-stack) md:right-0 md:bottom-0 md:left-1/2 md:m-0 md:[mask-image:none] print:transform-none! print:bg-transparent [&_canvas]:mix-blend-screen"
        >
          <ThreeStage
            scene="signal-hero"
            settled={resolved}
            className="absolute inset-0"
            fallback={
              maze ? (
                <Image
                  loading="eager"
                  fetchPriority="high"
                  src={maze.src}
                  alt={maze.alt}
                  width={maze.width}
                  height={maze.height}
                  sizes="(min-width: 768px) 50vw, 90vw"
                  className="h-full w-full object-contain print:opacity-100! [[data-resolved=false]>:has(>canvas)>&]:animate-[page-fade-in_var(--duration-stage)_var(--ease-fade)_var(--hero-hold)_both]"
                />
              ) : null
            }
          />
          {showRun ? (
            <video
              ref={runRef}
              aria-hidden
              data-hero-run=""
              muted
              playsInline
              preload="auto"
              className="pointer-events-none absolute inset-0 h-full w-full animate-[page-fade-in_var(--duration-stage)_var(--ease-fade)_both] object-contain mix-blend-screen print:hidden"
            >
              <source
                media="(max-width: 767px)"
                src={mazeRunMobile.src}
                type="video/mp4"
              />
              <source src={mazeRun.src} type="video/mp4" />
            </video>
          ) : null}
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
