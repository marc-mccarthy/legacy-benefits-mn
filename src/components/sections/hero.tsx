import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";

type HeroProps = {
  heading: string;
  subheading?: string | null;
  poster?: unknown;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  scheme?: Scheme;
};

/**
 * Full-bleed photographic hero — the device used by four of the six reference
 * sites, minus the background video they pair it with.
 *
 * The photograph carries no information the copy lacks, so it is `alt=""`; the
 * heading and subheading are the content.
 */
export function Hero({
  heading,
  subheading,
  poster,
  ctaLabel,
  ctaHref,
  scheme = "dark",
}: HeroProps) {
  const posterImage = mediaProps(poster as never);

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
        {/* No background video, by design. The element that used to sit here
         * carried `autoPlay loop` but had no `src` and no <source> child, so it
         * played nothing on any browser for as long as it existed. It was not
         * repaired: a looping autoplay background is motion that starts without
         * asking and runs indefinitely (WCAG 2.2.2 would then require a pause
         * control), and it is a documented vestibular trigger. The CMS field
         * that fed it has been dropped too, so nobody is offered a control that
         * does nothing. The photograph is the hero. */}
        {/* Scrim gradients live in globals.css (.hero-scrim) because they are
         * viewport-dependent — the copy occupies a different share of the frame
         * on a phone than on a desktop — and an inline style cannot hold a
         * media query. */}
        <div aria-hidden className="hero-scrim absolute inset-0" />
      </div>

      <Container className="flex min-h-[36rem] flex-col justify-center py-(--spacing-big)">
        <div className="max-w-2xl space-y-6 text-white">
          <h1 className="font-display text-4xl text-balance md:text-6xl">
            {heading}
          </h1>
          {subheading ? (
            <p className="text-xl leading-relaxed text-pretty text-white">
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
