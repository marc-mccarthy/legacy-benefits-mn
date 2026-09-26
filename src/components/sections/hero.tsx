import Link from "next/link";
import { HeroShader } from "@/components/motion/hero-shader";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";

type HeroProps = {
  heading: string;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  return (
    <Section
      scheme="dark"
      className="relative isolate overflow-hidden py-0 md:py-0"
    >
      <HeroShader />

      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />

      <Container
        // The shader's pause control sits at the band's bottom edge; the
        // bottom padding here is what keeps the copy clear of it.
        className="flex min-h-[min(38rem,calc(100svh-10.5rem))] flex-col justify-end pt-(--spacing-medium) pb-24 md:min-h-[min(calc(100svh-10.5rem),64rem)]"
      >
        <div className="space-y-6 text-white">
          <h1 className="font-display text-(length:--text-display-xl) leading-none font-bold tracking-[-0.06em] text-balance [font-stretch:125%]">
            {heading}
          </h1>
          {subheading ? (
            <p className="lead max-w-2xl text-xl leading-relaxed text-white">
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
