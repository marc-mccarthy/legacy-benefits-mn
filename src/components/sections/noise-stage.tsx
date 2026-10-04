import Image from "next/image";
import { LitWords } from "@/components/motion/lit-words";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { mediaProps } from "@/lib/media";

const SHAPES = [
  ["envelope", "noise.envelope"],
  ["torn-envelope", "noise.tornEnvelope"],
  ["form", "noise.form"],
  ["card", "noise.card"],
  ["folder", "noise.folder"],
] as const;

export function NoiseStage({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <Section
      scheme="black"
      data-noise=""
      className="relative isolate overflow-clip"
    >
      {SHAPES.map(([name, slot]) => {
        const shape = mediaProps(media[slot]);
        return shape ? (
          <Image
            key={name}
            data-noise-shape={name}
            src={shape.src}
            alt=""
            aria-hidden
            width={shape.width}
            height={shape.height}
          />
        ) : null;
      })}
      <Container className="relative z-10">
        <h2 className="max-w-4xl text-(length:--text-display-page) leading-[1.05] font-semibold tracking-[-0.01em] text-balance text-white">
          {heading}
        </h2>
        <LitWords className="lead mt-8 max-w-2xl text-white [&_.text-muted]:text-white">
          {body}
        </LitWords>
      </Container>
    </Section>
  );
}
