import MedicareAdvantageBody from "./services/medicare-advantage";
import MedicareSupplementBody from "./services/medicare-supplement";
import PartDBody from "./services/part-d";
import { media } from "./media";
import type { ServiceItem } from "./types";

export const services: ServiceItem[] = [
  {
    id: "medicare-advantage",
    slug: "medicare-advantage",
    title: "Medicare Advantage (Part C)",
    summary:
      "All-in-one plans that bundle hospital, medical, and usually drug coverage — with networks and extras that vary a lot by county.",
    order: 1,
    image: media["services.image"] ?? null,
    Body: MedicareAdvantageBody,
  },
  {
    id: "medicare-supplement",
    slug: "medicare-supplement",
    title: "Medicare Supplement (Medigap)",
    summary:
      "Fills the gaps Original Medicare leaves behind, with no networks. We compare pricing across the carriers we represent.",
    order: 2,
    image: media["services.image"] ?? null,
    Body: MedicareSupplementBody,
  },
  {
    id: "part-d",
    slug: "part-d",
    title: "Prescription drug coverage (Part D)",
    summary:
      "We check your actual medication list against each formulary, so the plan you pick covers what you take.",
    order: 3,
    image: media["services.image"] ?? null,
    Body: PartDBody,
  },
];

export function serviceBySlug(slug: string): ServiceItem | undefined {
  return services.find((service) => service.slug === slug);
}
