import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";

type HeroProps = {
  heading: string;
  subheading?: string | null;
  video?: { url?: string | null } | number | null;
  poster?: unknown;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  scheme?: Scheme;
};

/**
 * Full-bleed hero with an optional muted autoplay video — the device used by
 * four of the six reference sites.
 *
 * The poster image is always rendered underneath, so the hero is never blank
 * while the video loads, on a slow connection, or when the browser refuses to
 * autoplay. Video is decorative and carries no information the copy lacks.
 */
export function Hero({
  heading,
  subheading,
  video,
  poster,
  ctaLabel,
  ctaHref,
  scheme = "dark",
}: HeroProps) {
  const posterImage = mediaProps(poster as never);
  const videoUrl = video && typeof video !== "number" ? video.url : null;

  return (
    <Section scheme={scheme} className="relative isolate overflow-hidden py-0">
      <div className="absolute inset-0 -z-10">
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
        {videoUrl ? (
          <video
            className="absolute inset-0 size-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={posterImage?.src}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <Container className="flex min-h-[36rem] flex-col justify-center py-(--spacing-big)">
        <div className="max-w-2xl space-y-6 text-white">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            {heading}
          </h1>
          {subheading ? (
            <p className="text-lg leading-relaxed text-pretty text-white/90">
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
