import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function CtaBand({
  heading,
  body,
  ctaLabel,
  ctaHref,
  scheme = "dark",
}: {
  heading: string;
  body?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  scheme?: Scheme;
}) {
  return (
    <Section scheme={scheme}>
      <Container>
        <Reveal className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              {heading}
            </h2>
            {body ? <p className="text-muted text-lg">{body}</p> : null}
          </div>
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
