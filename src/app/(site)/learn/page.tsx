import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBand } from "@/components/sections/page-band";
import { LearningFilter } from "@/components/sections/learning-filter";
import { LearningGrid } from "@/components/sections/learning-grid";
import { articles } from "@/content/articles";

export const metadata: Metadata = {
  title: "Learning Center",
  description:
    "Plain-language articles, tools, and videos on how Medicare works and what to do when.",
};

export default function LearnPage() {
  return (
    <>
      <PageBand title="Learning Center" />
      <Suspense
        fallback={
          <LearningGrid
            scheme="light"
            heading="Medicare, explained"
            intro="Straight answers to the questions we get asked most."
            articles={articles as never}
          />
        }
      >
        <LearningFilter>
          <LearningGrid
            scheme="light"
            heading="Medicare, explained"
            intro="Straight answers to the questions we get asked most."
            articles={articles as never}
          />
        </LearningFilter>
      </Suspense>
    </>
  );
}
