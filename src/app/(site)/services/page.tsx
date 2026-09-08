import type { Metadata } from "next";
import { ServiceGrid } from "@/components/sections/service-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { getServices } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Medicare Advantage, Medicare Supplement, Part D, and related coverage — explained by a licensed agent.",
};

export default async function ServicesPage() {
  const services = await getServices().catch(() => []);

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
      />
    </>
  );
}
