import type { Metadata } from "next";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { JsonLd, organizationSchema } from "@/components/seo/json-ld";
import { articles } from "@/content/articles";
import { carriers } from "@/content/carriers";
import { upcomingEvents } from "@/content/events";
import { homeBlocks } from "@/content/home";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { testimonials } from "@/content/testimonials";
import { getBusinessIdentity } from "@/lib/business";

export const metadata: Metadata = {
  description:
    "Independent Medicare guidance — compare Medicare Advantage, Supplement, and Part D options with a licensed local agent.",
};

export default async function HomePage() {
  const identity = await getBusinessIdentity();
  const events = upcomingEvents(new Date()).slice(0, 9);

  const blockData = {
    services: services as never,
    events: events as never,
    articles: articles.slice(0, 3) as never,
    stats: site.stats as never,
    testimonials: testimonials as never,
    carriers: carriers as never,
    phone: identity.phone ?? null,
  };

  return (
    <>
      <JsonLd
        data={organizationSchema({
          name: identity.name,
          phone: identity.phone,
          email: identity.email,
          address: identity.address,
        })}
      />

      <RenderBlocks blocks={homeBlocks as never} data={blockData} />
    </>
  );
}
