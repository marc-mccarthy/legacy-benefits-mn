import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { QuoteStack } from "@/components/sections/quote-stack";
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
    <Section
      scheme={scheme}
      data-stage=""
      aria-labelledby="testimonials-heading"
    >
      <Container className="space-y-(--spacing-medium)">
        <Reveal>
          <h2
            id="testimonials-heading"
            className="font-display text-(length:--text-display-lg)"
          >
            {heading ?? "What clients say"}
          </h2>
        </Reveal>

        <QuoteStack
          items={items.map(({ photo, ...item }) => ({
            ...item,
            photoSrc: mediaProps(photo as never)?.src,
          }))}
        />
      </Container>
    </Section>
  );
}
