import { LitWords } from "@/components/motion/lit-words";
import { NoiseField } from "@/components/sections/noise-field";
import { Container, Section } from "@/components/ui/section";

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
      <NoiseField />
      <Container className="relative z-10">
        <div className="max-w-2xl bg-black shadow-[0_0_3rem_5rem_#000]">
          <h2 className="max-w-4xl text-(length:--text-display-page) leading-[1.05] font-semibold tracking-[-0.01em] text-balance text-white">
            {heading}
          </h2>
          <LitWords className="lead mt-8 max-w-2xl">{body}</LitWords>
        </div>
      </Container>
    </Section>
  );
}
