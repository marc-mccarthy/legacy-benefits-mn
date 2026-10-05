import type { MetadataRoute } from "next";
import { articles } from "@/content/articles";
import { events } from "@/content/events";
import { services } from "@/content/services";
import { team } from "@/content/team";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const lastModified = new Date();

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
    url: `${origin}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const collections = [
    { prefix: "/services", slugs: services.map((item) => item.slug) },
    { prefix: "/team", slugs: team.map((item) => item.slug) },
    { prefix: "/events", slugs: events.map((item) => item.slug) },
    { prefix: "/learn", slugs: articles.map((item) => item.slug) },
  ];

  const dynamicRoutes = collections.flatMap(({ prefix, slugs }) =>
    slugs.map((slug) => ({
      url: `${origin}${prefix}/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [...staticRoutes, ...dynamicRoutes];
}
