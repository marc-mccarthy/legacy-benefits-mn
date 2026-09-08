import { Container, Section } from "@/components/ui/section";
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
import { RichTextBody, RichTextSection } from "@/components/sections/rich-text";
import { ServiceGrid } from "@/components/sections/service-grid";
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
  services: {
    id: number | string;
    title: string;
    slug: string;
    summary: string;
  }[];
  events: EventItem[];
  articles: ArticleItem[];
  stats: Stat[];
  testimonials: Testimonial[];
  carriers: Carrier[];
};

/**
 * Maps Payload page blocks onto section components.
 *
 * Collection-backed blocks (services, events, resources) receive their data
 * from the page, already fetched — an editor arranging blocks should not be
 * able to change how many queries a page runs.
 */
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
                scheme={scheme}
                heading={block.heading as string}
                subheading={block.subheading as string | null}
                video={block.video as never}
                poster={block.poster}
                ctaLabel={block.ctaLabel as string | null}
                ctaHref={block.ctaHref as string | null}
              />
            );

          case "richText":
            return (
              <RichTextSection
                key={key}
                scheme={scheme}
                content={block.content}
              />
            );

          case "serviceGrid":
            return (
              <ServiceGrid
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                intro={block.intro as string | null}
                services={data.services}
              />
            );

          case "eventCarousel":
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
                scheme={scheme}
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
                carriers={data.carriers}
              />
            );

          case "faq":
            return (
              <Faq
                key={key}
                scheme={scheme}
                heading={block.heading as string | null}
                items={(
                  (block.items as { question: string; answer: unknown }[]) ?? []
                ).map((item) => ({
                  question: item.question,
                  answer: <RichTextBody data={item.answer} />,
                }))}
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
              />
            );

          default:
            // An unknown block means the config and the renderer have drifted.
            // Render nothing rather than crashing a live marketing page.
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

/** Fallback used when a page has no layout blocks yet. */
export function EmptyPageNotice() {
  return (
    <Section>
      <Container>
        <p className="text-muted">
          This page has no content blocks yet. Add them in the admin panel.
        </p>
      </Container>
    </Section>
  );
}
