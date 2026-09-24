import Image from "next/image";
import Link from "next/link";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Curtain } from "@/components/motion/curtain";
import { LitWords } from "@/components/motion/lit-words";
import { mediaProps } from "@/lib/media";
import { cn } from "@/lib/utils";

export type ServiceItem = {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
  image?: unknown;
};

export function ServiceGrid({
  heading,
  intro,
  services,
  scheme = "light",
}: {
  heading?: string | null;
  intro?: string | null;
  services: ServiceItem[];
  scheme?: Scheme;
}) {
  if (services.length === 0) return null;

  return (
    <Section
      scheme={scheme}
      aria-labelledby="services-heading"
      className="py-0"
    >
      <Container className="bg-surface sticky top-0 z-10 max-w-2xl space-y-4 pt-(--spacing-large) pb-(--spacing-medium) md:pt-(--spacing-big)">
        <h2
          id="services-heading"
          className="font-display text-(length:--text-display-lg)"
        >
          {heading ?? "How we help"}
        </h2>
        {intro ? <LitWords className="lead text-lg">{intro}</LitWords> : null}
      </Container>

      <Curtain>
        <ul>
          {services.map((service, i) => {
            const photo = mediaProps(service.image as never);
            const photoFirst = i % 2 === 0;

            return (
              <li
                key={service.id}
                className={cn(
                  "grid items-center",
                  photo && "md:grid-cols-2",
                  i > 0 && !photo && "border-border-subtle border-t",
                )}
              >
                {photo ? (
                  <div
                    className={cn(
                      "relative aspect-[4/3] w-full md:aspect-auto md:h-full md:min-h-[26rem]",
                      photoFirst ? "md:order-1" : "md:order-2",
                    )}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}

                <div
                  className={cn(
                    "px-5 py-(--spacing-large) md:px-12",
                    photo && (photoFirst ? "md:order-2" : "md:order-1"),
                    !photo && "mx-auto w-full max-w-3xl md:px-8",
                  )}
                >
                  <div className="max-w-xl space-y-4">
                    <h3 className="text-(length:--text-display-md) font-semibold">
                      {service.title}
                    </h3>
                    <p className="text-muted leading-relaxed text-pretty">
                      {service.summary}
                    </p>
                    <Link
                      href={`/services/${service.slug}`}
                      className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                    >
                      Learn more
                      <span className="sr-only"> about {service.title}</span>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Curtain>
    </Section>
  );
}
