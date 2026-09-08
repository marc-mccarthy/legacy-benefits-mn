import { getPayload, type DataFromCollectionSlug, type Where } from "payload";
import { unstable_cache } from "next/cache";
import config from "@payload-config";

/** Local API client — in-process, so no HTTP hop for server components. */
export async function getPayloadClient() {
  return getPayload({ config });
}

export const getSiteSettings = unstable_cache(
  async () => {
    const payload = await getPayloadClient();
    return payload.findGlobal({ slug: "site-settings", depth: 1 });
  },
  ["site-settings"],
  { tags: ["site-settings"], revalidate: 300 },
);

export const getPageBySlug = async (slug: string) => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  });
  return result.docs[0] ?? null;
};

export const getServices = async () => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "services",
    sort: "order",
    limit: 50,
    depth: 1,
  });
  return result.docs;
};

export const getTeam = async () => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "team",
    sort: "order",
    limit: 50,
    depth: 1,
  });
  return result.docs;
};

/** Upcoming events only — a past event on a marketing page is a support call. */
export const getUpcomingEvents = async (limit = 12) => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "events",
    where: { startsAt: { greater_than: new Date().toISOString() } },
    sort: "startsAt",
    limit,
    depth: 1,
  });
  return result.docs;
};

export const getArticles = async (opts: {
  type?: string;
  category?: string;
  page?: number;
  limit?: number;
}) => {
  const payload = await getPayloadClient();
  const where: Where = {};
  if (opts.type) where.type = { equals: opts.type };
  if (opts.category) where["categories.slug"] = { equals: opts.category };

  return payload.find({
    collection: "articles",
    where,
    sort: "-publishedAt",
    page: opts.page ?? 1,
    limit: opts.limit ?? 9,
    depth: 1,
  });
};

export const getTestimonials = async () => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "testimonials",
    sort: "order",
    limit: 20,
    depth: 1,
  });
  return result.docs;
};

export const getCarriers = async () => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "carriers",
    sort: "order",
    limit: 50,
    depth: 1,
  });
  return result.docs;
};

export const getCategories = async () => {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "categories", limit: 100 });
  return result.docs;
};

/**
 * Generic over the collection so callers get the concrete document type
 * (Service, Team, Event, Article) rather than a union they have to narrow at
 * every property access.
 */
export const getDocBySlug = async <
  T extends "services" | "team" | "events" | "articles",
>(
  collection: T,
  slug: string,
): Promise<DataFromCollectionSlug<T> | null> => {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  });
  return (result.docs[0] as DataFromCollectionSlug<T> | undefined) ?? null;
};
