import type { Metadata } from "next";
import { LearningGrid } from "@/components/sections/learning-grid";
import { getArticles } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Learning Center",
  description:
    "Plain-language articles, tools, and videos on how Medicare works and what to do when.",
};

/**
 * Filtering is done on the server from searchParams — each filtered view is a
 * real URL that can be linked, shared, and indexed. This is the native
 * replacement for the Finsweet client-side list filtering used on the Webflow
 * reference site.
 */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const result = await getArticles({
    type: params.type,
    category: params.category,
    page: Number(params.page ?? 1),
    limit: 9,
  }).catch(() => ({ docs: [] }));

  return (
    <LearningGrid
      scheme="light"
      heading="Learning Center"
      intro="Straight answers to the questions we get asked most."
      articles={result.docs as never}
      showFilters
      activeType={params.type}
    />
  );
}
