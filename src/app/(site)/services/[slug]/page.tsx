import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/sections/cta-band";
import { RichTextBody } from "@/components/sections/rich-text";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { Container, Prose, Section } from "@/components/ui/section";
import { getDocBySlug, getSiteSettings } from "@/lib/payload";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug("services", slug).catch(() => null);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [doc, settings] = await Promise.all([
    getDocBySlug("services", slug).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  if (!doc) notFound();

  return (
    <>
      <Section>
        <Container>
          <Prose className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {doc.title}
            </h1>
            <p className="text-muted text-lg leading-relaxed">{doc.summary}</p>
            <RichTextBody data={doc.body} />
            {/* Required wherever plan options are described. */}
            <TpmoDisclaimer
              className="text-muted border-border-subtle border-t pt-6 text-sm leading-relaxed"
              orgCount={settings?.compliance?.orgCount ?? undefined}
              planCount={settings?.compliance?.planCount ?? undefined}
            />
          </Prose>
        </Container>
      </Section>
      <CtaBand
        heading="Want help comparing your options?"
        ctaLabel="Request a call"
        ctaHref="/contact"
      />
    </>
  );
}
