import type { Metadata } from "next";
import { ServiceGrid } from "@/components/sections/service-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { services } from "@/content/services";
import { getBusinessIdentity } from "@/lib/business";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Medicare Advantage, Medicare Supplement, Part D, and related coverage — explained by a licensed agent.",
};

export default async function ServicesPage() {
  const identity = await getBusinessIdentity();

  return (
    <>
      <ServiceGrid
        heading="How we help"
        intro="Independent guidance across the coverage types we are appointed to offer."
        services={services as never}
      />
      <CtaBand
        heading="Have a question about a specific plan?"
        ctaLabel="Talk to a licensed agent"
        ctaHref="/contact"
        phone={identity.phone ?? null}
      />
    </>
  );
}
