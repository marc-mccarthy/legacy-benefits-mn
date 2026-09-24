import Image from "next/image";
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
  scheme = "dark",
}: {
  heading?: string | null;
  items: Testimonial[];
  scheme?: Scheme;
}) {
  if (items.length === 0) return null;

  return (
    <Section scheme={scheme} aria-labelledby="testimonials-heading">
      <Container className="space-y-(--spacing-medium)">
        <Reveal>
          <h2
            id="testimonials-heading"
            className="font-display text-(length:--text-display-lg)"
          >
            {heading ?? "What clients say"}
          </h2>
        </Reveal>

        <Reveal>
          <ul className="divide-border-subtle divide-y">
            {items.map((item) => {
              const photo = mediaProps(item.photo as never);
              return (
                <li key={item.id}>
                  <figure className="flex flex-col gap-6 py-(--spacing-medium)">
                    <blockquote className="font-display max-w-4xl text-(length:--text-display-lg) leading-snug text-pretty">
                      {`“${item.quote}”`}
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
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>
    </Section>
  );
}
