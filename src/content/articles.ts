import AdvantageOrSupplementBody from "./articles/advantage-or-supplement";
import AnnualEnrollmentCheckBody from "./articles/annual-enrollment-check";
import DrugCostWorksheetBody from "./articles/drug-cost-worksheet";
import EnrollmentChecklistBody from "./articles/enrollment-checklist";
import PartDCoverageGapsBody from "./articles/part-d-coverage-gaps";
import Turning65TimelineBody from "./articles/turning-65-timeline";
import WhenCanIChangeMyPlanBody from "./articles/when-can-i-change-my-plan";
import { media } from "./media";
import type { Article } from "./types";

const cover = media["articles.coverImage"] ?? null;

export const articles: Article[] = [
  {
    id: "when-can-i-change-my-plan",
    slug: "when-can-i-change-my-plan",
    title: "When can I change my Medicare plan?",
    type: "article",
    excerpt:
      "The enrollment windows, in plain English, and what happens if you miss one.",
    publishedAt: "2026-09-11T02:37:32.636Z",
    coverImage: cover,
    Body: WhenCanIChangeMyPlanBody,
  },
  {
    id: "enrollment-checklist",
    slug: "enrollment-checklist",
    title: "Medicare enrollment checklist",
    type: "tool",
    excerpt:
      "A one-page list of what to gather before you compare plans, including your medication list.",
    publishedAt: "2026-09-10T02:37:32.655Z",
    coverImage: null,
    Body: EnrollmentChecklistBody,
  },
  {
    id: "advantage-or-supplement",
    slug: "advantage-or-supplement",
    title: "Advantage or Supplement: how to think about the choice",
    type: "article",
    excerpt:
      "The trade-offs that actually matter — networks, travel, and predictability of cost.",
    publishedAt: "2026-09-09T02:37:32.666Z",
    coverImage: cover,
    Body: AdvantageOrSupplementBody,
  },
  {
    id: "part-d-coverage-gaps",
    slug: "part-d-coverage-gaps",
    title: "What Part D actually covers, and the gaps people hit",
    type: "article",
    excerpt:
      "How formularies, tiers, and the annual out-of-pocket cap work in practice.",
    publishedAt: "2026-09-08T02:37:32.679Z",
    coverImage: null,
    Body: PartDCoverageGapsBody,
  },
  {
    id: "drug-cost-worksheet",
    slug: "drug-cost-worksheet",
    title: "Drug cost comparison worksheet",
    type: "tool",
    excerpt:
      "Bring your medication list and compare real annual cost across the plans you are considering.",
    publishedAt: "2026-09-07T02:37:32.690Z",
    coverImage: null,
    Body: DrugCostWorksheetBody,
  },
  {
    id: "turning-65-timeline",
    slug: "turning-65-timeline",
    title: "Turning 65: a 6-month timeline",
    type: "video",
    excerpt:
      "A short walkthrough of what to do and when, starting three months before your birthday month.",
    publishedAt: "2026-09-06T02:37:32.702Z",
    coverImage: cover,
    Body: Turning65TimelineBody,
  },
  {
    id: "annual-enrollment-check",
    slug: "annual-enrollment-check",
    title: "Do I need to do anything during Annual Enrollment?",
    type: "article",
    excerpt:
      "Plans change every year. Here is the 15-minute check that catches the expensive surprises.",
    publishedAt: "2026-09-05T02:37:32.716Z",
    coverImage: null,
    Body: AnnualEnrollmentCheckBody,
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
