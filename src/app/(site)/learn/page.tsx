import type { Metadata } from "next";
import { Suspense } from "react";
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
    <Suspense
      fallback={
        <LearningGrid
          headingLevel="h1"
          scheme="light"
          heading="Learning Center"
          intro="Straight answers to the questions we get asked most."
          articles={articles as never}
        />
      }
    >
      <LearningFilter>
        <LearningGrid
          headingLevel="h1"
          scheme="light"
          heading="Learning Center"
          intro="Straight answers to the questions we get asked most."
          articles={articles as never}
        />
      </LearningFilter>
    </Suspense>
  );
}
