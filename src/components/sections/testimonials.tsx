import Image from "next/image";
import { Quote } from "lucide-react";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { Monogram } from "@/components/ui/monogram";
import { mediaProps } from "@/lib/media";

export type Testimonial = {
  id: number | string;
  quote: string;
  author: string;
  location?: string | null;
  photo?: unknown;
};

export function Testimonials({
  heading,
  items,
  scheme = "light",
}: {
  heading?: string | null;
  items: Testimonial[];
  scheme?: Scheme;
}) {
  if (items.length === 0) return null;

  return (
    <Section scheme={scheme} aria-labelledby="testimonials-heading">
      <Container className="space-y-10">
        <Reveal>
          <h2
            id="testimonials-heading"
            className="font-display text-3xl font-semibold tracking-tight md:text-5xl"
          >
            {heading ?? "What clients say"}
          </h2>
        </Reveal>

        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const photo = mediaProps(item.photo as never);
            return (
              <li key={item.id} className="flex">
                <Reveal
                  delay={Math.min(i * 0.05, 0.15)}
                  className="flex w-full"
                >
                  <figure className="border-border-subtle flex w-full flex-col gap-5 rounded-(--radius-card) border p-6">
                    <Quote aria-hidden className="text-accent size-7" />
                    <blockquote className="flex-1 text-lg leading-relaxed text-pretty">
                      {item.quote}
                    </blockquote>
                    <figcaption className="flex items-center gap-3">
                      {photo ? (
                        <Image
                          src={photo.src}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 rounded-full object-cover"
                        />
                      ) : (
                        <Monogram
                          name={item.author}
                          className="size-12 rounded-full"
                        />
                      )}
                      <span>
                        <span className="block font-semibold">
                          {item.author}
                        </span>
                        {item.location ? (
                          <span className="text-muted block">
                            {item.location}
                          </span>
                        ) : null}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
