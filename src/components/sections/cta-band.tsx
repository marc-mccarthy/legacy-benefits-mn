import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { ParticleField } from "@/components/motion/particle-field";
import { Reveal } from "@/components/motion/reveal";

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
  const isNightBand = scheme === "dark";

  return (
    <Section scheme={scheme} className="relative isolate">
      {isNightBand ? <ParticleField /> : null}
      <Container>
        <Reveal className="flex max-w-4xl flex-col items-start gap-6">
          <h2 className="text-(length:--text-display-md) font-semibold text-balance">
            {heading}
          </h2>
          {body ? <p className="text-muted lead max-w-2xl">{body}</p> : null}

          {phone ? (
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="tabular text-(length:--text-display-lg) font-semibold tracking-[0.02em] hover:underline"
            >
              {phone}
            </a>
          ) : null}

          {ctaHref && ctaLabel ? (
            <Button asChild size="lg">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : null}
        </Reveal>
      </Container>
    </Section>
  );
}
