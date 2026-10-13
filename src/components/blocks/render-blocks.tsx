import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";
import { CtaBand } from "@/components/sections/cta-band";
import {
  EventCarousel,
  type EventItem,
} from "@/components/sections/event-carousel";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import {
  LearningGrid,
  type ArticleItem,
} from "@/components/sections/learning-grid";
import { LakeSequence } from "@/components/sections/lake-sequence";
import { NoiseStage } from "@/components/sections/noise-stage";
import { SignalPortrait } from "@/components/sections/signal-portrait";
import { RichTextSection } from "@/components/sections/rich-text";
import type { ServiceItem } from "@/components/sections/service-grid";
import { ServiceRail } from "@/components/sections/service-rail";
import { StatsBand, type Stat } from "@/components/sections/stats-band";
import {
  Testimonials,
  type Testimonial,
} from "@/components/sections/testimonials";
import {
  CarrierStrip,
  type Carrier,
} from "@/components/sections/carrier-strip";
import type { Scheme } from "@/components/ui/section";

type Block = Record<string, unknown> & { blockType: string; scheme?: Scheme };

type BlockData = {
  services: ServiceItem[];
  events: EventItem[];
  articles: ArticleItem[];
  stats: Stat[];
  testimonials: Testimonial[];
  carriers: Carrier[];
  phone?: string | null;
};

export function RenderBlocks({
  blocks,
  data,
}: {
  blocks: Block[] | null | undefined;
  data: BlockData;
}) {
  if (!blocks?.length) return null;

  return (
    <>
      {blocks.map((block, i) => {
        const scheme = (block.scheme as Scheme) ?? "light";
        const key = `${block.blockType}-${i}`;

        switch (block.blockType) {
          case "hero":
            return (
              <Hero
                key={key}
                heading={block.heading as string}
                subheading={block.subheading as string | null}
                ctaLabel={block.ctaLabel as string | null}
                ctaHref={block.ctaHref as string | null}
              />
            );

          case "noise":
            return (
              <NoiseStage
                key={key}
                heading={block.heading as string}
                body={block.body as string}
              />
            );

          case "signal":
            return (
              <SignalPortrait
                key={key}
                heading={block.heading as string}
                ctaLabel={block.ctaLabel as string}
                phone={data.phone}
              />
            );

          case "richText":
            return (
              <RichTextSection
                key={key}
                scheme={scheme}
                content={block.content as ReactNode}
              />
            );

          case "serviceGrid":
            return (
              <ServiceRail
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                intro={block.intro as string | null}
                services={data.services.map(({ id, title, slug, summary }) => ({
                  id,
                  title,
                  slug,
                  summary,
                }))}
              />
            );

          case "lake":
            return (
              <LakeSequence
                key={key}
                heading={block.heading as string}
                body={block.body as string}
              />
            );

          case "eventCarousel":
            if (data.events.length === 0) return null;
            return (
              <Section
                key={key}
                scheme={scheme}
                aria-labelledby="events-heading"
              >
                <EventCarousel
                  heading={block.heading as string | null}
                  events={data.events}
                />
              </Section>
            );

          case "learningGrid":
            return (
              <LearningGrid
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                intro={block.intro as string | null}
                articles={data.articles}
              />
            );

          case "stats":
            return <StatsBand key={key} scheme={scheme} stats={data.stats} />;

          case "testimonials":
            return (
              <Testimonials
                key={key}
                scheme={block.scheme as Scheme | undefined}
                heading={block.heading as string | null}
                items={data.testimonials}
              />
            );

          case "carrierStrip":
            return (
              <CarrierStrip
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                note={block.note as string | null}
                carriers={data.carriers}
              />
            );

          case "faq":
            return (
              <Faq
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                items={
                  (block.items as { question: string; answer: ReactNode }[]) ??
                  []
                }
              />
            );

          case "ctaBand":
            return (
              <CtaBand
                key={key}
                scheme={scheme}
                heading={block.heading as string}
                body={block.body as string | null}
                ctaLabel={block.ctaLabel as string | null}
                ctaHref={block.ctaHref as string | null}
                phone={data.phone}
              />
            );

          default:
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `RenderBlocks: no component for "${block.blockType}"`,
              );
            }
            return null;
        }
      })}
    </>
  );
}
