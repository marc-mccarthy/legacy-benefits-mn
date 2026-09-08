import type { MetadataRoute } from "next";
import { getPayloadClient } from "@/lib/payload";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteUrl();
  const base = () => origin;

  const staticRoutes = [
    "",
    "/services",
    "/team",
    "/events",
    "/learn",
    "/contact",
    "/scope-of-appointment",
    "/disclosures",
    "/privacy",
    "/accessibility",
    "/do-not-contact",
  ].map((path) => ({
    url: `${base()}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const payload = await getPayloadClient();
    const collections = [
      { slug: "services", prefix: "/services" },
      { slug: "team", prefix: "/team" },
      { slug: "events", prefix: "/events" },
      { slug: "articles", prefix: "/learn" },
    ] as const;

    const dynamic = await Promise.all(
      collections.map(async ({ slug, prefix }) => {
        const result = await payload.find({
          collection: slug,
          limit: 500,
          depth: 0,
        });
        return result.docs.map((doc) => ({
          url: `${base()}${prefix}/${(doc as { slug: string }).slug}`,
          lastModified: new Date(
            (doc as { updatedAt?: string }).updatedAt ?? Date.now(),
          ),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }));
      }),
    );

    return [...staticRoutes, ...dynamic.flat()];
  } catch {
    // A database hiccup should degrade the sitemap, not fail the request.
    return staticRoutes;
  }
}
