import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// A metadata route is a route handler, and `output: "export"` requires one
// to declare itself static.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
