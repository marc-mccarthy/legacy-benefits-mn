import type { Metadata } from "next";
import {
  EmptyPageNotice,
  RenderBlocks,
} from "@/components/blocks/render-blocks";
import { Hero } from "@/components/sections/hero";
import { ServiceGrid } from "@/components/sections/service-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { LearningGrid } from "@/components/sections/learning-grid";
import { EventCarousel } from "@/components/sections/event-carousel";
import { Section } from "@/components/ui/section";
import { JsonLd, organizationSchema } from "@/components/seo/json-ld";
import {
  getArticles,
  getCarriers,
  getPageBySlug,
  getServices,
  getSiteSettings,
  getTestimonials,
  getUpcomingEvents,
} from "@/lib/payload";

export const metadata: Metadata = {
  description:
    "Independent Medicare guidance — compare Medicare Advantage, Supplement, and Part D options with a licensed local agent.",
};

export default async function HomePage() {
  const [page, services, events, articles, settings, testimonials, carriers] =
    await Promise.all([
      getPageBySlug("home").catch(() => null),
      getServices().catch(() => []),
      getUpcomingEvents(9).catch(() => []),
      getArticles({ limit: 3 }).catch(() => ({ docs: [] })),
      getSiteSettings().catch(() => null),
      getTestimonials().catch(() => []),
      getCarriers().catch(() => []),
    ]);

  const blockData = {
    services: services as never,
    events: events as never,
    articles: articles.docs as never,
    stats: (settings?.stats ?? []) as never,
    testimonials: testimonials as never,
    carriers: carriers as never,
  };

  return (
    <>
      <JsonLd
        data={organizationSchema({
          name: process.env["BUSINESS_NAME"] ?? "Medicare Advisors",
          phone: settings?.contact?.phone ?? undefined,
          email: settings?.contact?.email ?? undefined,
          address: settings?.contact?.address ?? undefined,
        })}
      />

      {page?.layout?.length ? (
        <RenderBlocks blocks={page.layout as never} data={blockData} />
      ) : services.length || events.length ? (
        // No page document authored yet: render a sensible default composition
        // from the collections rather than an empty screen.
        <>
          <Hero
            heading="Medicare decisions, made clear."
            subheading="Independent, licensed guidance on Medicare Advantage, Supplement, and Part D — with a real person who answers the phone."
            ctaLabel="Talk to a licensed agent"
            ctaHref="/contact"
          />
          <ServiceGrid services={services as never} />
          {events.length ? (
            <Section scheme="muted" aria-labelledby="events-heading">
              <EventCarousel events={events as never} />
            </Section>
          ) : null}
          {articles.docs.length ? (
            <LearningGrid articles={articles.docs as never} />
          ) : null}
          <CtaBand
            heading="Not sure where to start?"
            body="Tell us a little about your situation and a licensed agent will walk you through your options."
            ctaLabel="Request a call"
            ctaHref="/contact"
          />
        </>
      ) : (
        <EmptyPageNotice />
      )}
    </>
  );
}
