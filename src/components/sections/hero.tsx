import Image from "next/image";
import Link from "next/link";
import { HeroMotion, type HeroFrame } from "@/components/motion/hero-motion";
import { HeroVideo } from "@/components/motion/hero-video";
import { HeroParallax } from "@/components/motion/hero-parallax";
import { Button } from "@/components/ui/button";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";
import { cn } from "@/lib/utils";

type HeroProps = {
  heading: string;
  subheading?: string | null;
  poster?: unknown;
  slides?: unknown;
  videoSrc?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  scheme?: Scheme;
};

export function Hero({
  heading,
  subheading,
  poster,
  slides,
  videoSrc,
  ctaLabel,
  ctaHref,
  scheme = "dark",
}: HeroProps) {
  const posterImage = mediaProps(poster as never);

  const effectiveScheme: Scheme = posterImage ? scheme : "dark";

  const frames: HeroFrame[] = [];
  for (const media of [poster, ...(Array.isArray(slides) ? slides : [])]) {
    const image = mediaProps(media as never);
    if (image && !frames.some((frame) => frame.src === image.src)) {
      frames.push({ src: image.src });
    }
  }
  const hasMotion = frames.length > 1;

  return (
    <Section
      scheme={effectiveScheme}
      className="relative isolate overflow-hidden py-0 md:py-0"
    >
      <HeroParallax>
        {posterImage ? (
          <Image
            src={posterImage.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
      </HeroParallax>

      {videoSrc ? (
        <HeroVideo src={videoSrc} poster={posterImage?.src} />
      ) : hasMotion ? (
        <HeroMotion frames={frames} />
      ) : null}

      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />

      <Container
        className={cn(
          "flex min-h-[min(38rem,calc(100svh-10.5rem))] flex-col justify-end pt-(--spacing-medium) md:min-h-[min(calc(100svh-10.5rem),64rem)] md:pt-(--spacing-large)",
          hasMotion ? "pb-24" : "pb-(--spacing-medium)",
        )}
      >
        <div className="space-y-6 text-white">
          <h1 className="font-display text-(length:--text-display-xl) leading-[0.95] tracking-[-0.03em] text-balance">
            {heading}
          </h1>
          {subheading ? (
            <p className="lead max-w-4xl text-xl leading-relaxed text-white">
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
    </Section>
  );
}
