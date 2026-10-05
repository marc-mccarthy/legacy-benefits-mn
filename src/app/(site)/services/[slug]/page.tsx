import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBand } from "@/components/sections/page-band";
import { RichTextBody } from "@/components/sections/rich-text";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { Container, Prose, Section } from "@/components/ui/section";
import { serviceBySlug, services } from "@/content/services";
import { site } from "@/content/site";
import { getBusinessIdentity } from "@/lib/business";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = serviceBySlug(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const doc = serviceBySlug(slug);

  if (!doc) notFound();

  const identity = await getBusinessIdentity();
  const Body = doc.Body;

  return (
    <>
      <PageBand title={doc.title} />
      <Section>
        <Container>
          <Prose className="space-y-6">
            <p className="lead text-muted text-lg leading-relaxed">
              {doc.summary}
            </p>
            <RichTextBody>
              <Body />
            </RichTextBody>
            <TpmoDisclaimer
              className="text-muted border-border-subtle border-t pt-6 leading-relaxed"
              orgCount={site.compliance.orgCount ?? undefined}
              planCount={site.compliance.planCount ?? undefined}
            />
          </Prose>
        </Container>
      </Section>
      <CtaBand
        heading="Want help comparing your options?"
        ctaLabel="Request a call"
        ctaHref="/contact"
        phone={identity.phone ?? null}
      />
    </>
  );
}
