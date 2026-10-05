import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { PhoneLink } from "@/components/ui/phone-link";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { ThreeStage } from "@/components/motion/three-stage";
import { seededRandom } from "@/lib/random";
import { cn } from "@/lib/utils";

const STAR_COUNT = 40;

const fallbackStars = (() => {
  const random = seededRandom(20261003);
  return Array.from({ length: STAR_COUNT }, () => ({
    cx: Math.round(random() * 1600),
    cy: Math.round(random() * 900),
    r: 1.5 + Math.round(random() * 25) / 10,
    opacity: 0.45 + Math.round(random() * 55) / 100,
  }));
})();

function StaticStars() {
  return (
    <svg
      aria-hidden
      data-close-stars=""
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full print:hidden [:has(>canvas)>&]:hidden"
    >
      {fallbackStars.map((star, index) => (
        <circle
          key={index}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          opacity={star.opacity}
          fill="var(--color-star-gold)"
        />
      ))}
    </svg>
  );
}

export function CtaBand({
  heading,
  body,
  ctaLabel,
  ctaHref,
  phone,
  scheme = "dark",
}: {
  heading: string;
  body?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  phone?: string | null;
  scheme?: Scheme;
}) {
  const isNightBand = scheme === "black";

  return (
    <Section
      scheme={scheme}
      className={cn("relative isolate", isNightBand && "overflow-hidden")}
      data-night-close={isNightBand ? "" : undefined}
    >
      {isNightBand ? (
        <ThreeStage
          scene="signal-close"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,var(--color-ground-dark),transparent)]"
          fallback={<StaticStars />}
        />
      ) : null}
      <Container>
        <Reveal
          className={cn(
            "flex max-w-4xl flex-col items-start gap-6",
            isNightBand &&
              "bg-ground-black shadow-[0_0_5rem_2.5rem_var(--color-ground-black)]",
          )}
        >
          <h2 className="text-(length:--text-display-md) leading-[1.2] font-semibold tracking-[-0.01em] text-balance">
            {heading}
          </h2>
          {body ? <p className="text-muted lead max-w-2xl">{body}</p> : null}

          {phone ? (
            <PhoneLink
              phone={phone}
              className={
                isNightBand
                  ? "text-star-gold text-(length:--text-display-hero) leading-none"
                  : "text-(length:--text-display-lg)"
              }
            />
          ) : null}

          {ctaHref && ctaLabel ? (
            <Magnetic>
              <Button asChild size="lg">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </Magnetic>
          ) : null}
        </Reveal>
      </Container>
    </Section>
  );
}
