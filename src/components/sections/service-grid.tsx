import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

type Service = {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
};

export function ServiceGrid({
  heading,
  intro,
  services,
  scheme = "light",
}: {
  heading?: string | null;
  intro?: string | null;
  services: Service[];
  scheme?: Scheme;
}) {
  if (services.length === 0) return null;

  return (
    <Section scheme={scheme} aria-labelledby="services-heading">
      <Container className="space-y-10">
        <Reveal className="max-w-2xl space-y-4">
          <h2
            id="services-heading"
            className="font-display text-3xl font-semibold tracking-tight text-balance md:text-5xl"
          >
            {heading ?? "How we help"}
          </h2>
          {intro ? <p className="text-muted text-lg">{intro}</p> : null}
        </Reveal>

        <ul className="grid gap-6 md:grid-cols-3">
          {services.map((service, i) => (
            <li key={service.id} className="flex">
              <Reveal delay={Math.min(i * 0.05, 0.15)} className="flex w-full">
                <Card className="w-full">
                  <CardBody>
                    <h3 className="text-xl font-semibold">{service.title}</h3>
                    <p className="text-muted flex-1 leading-relaxed">
                      {service.summary}
                    </p>
                    <Link
                      href={`/services/${service.slug}`}
                      className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
                    >
                      Learn more
                      <ArrowRight aria-hidden className="size-4" />
                      <span className="sr-only"> about {service.title}</span>
                    </Link>
                  </CardBody>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
