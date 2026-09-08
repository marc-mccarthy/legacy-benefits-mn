import type { Metadata } from "next";
import { Container, Prose, Section } from "@/components/ui/section";
import {
  EnrollmentDisclaimer,
  GovernmentDisclaimer,
  LanguageAccessNotice,
  TpmoDisclaimer,
} from "@/components/compliance/disclosures";
import { getSiteSettings } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Disclosures",
  description:
    "Required Medicare marketing disclosures, licensing information, and plan availability statements.",
};

export default async function DisclosuresPage() {
  const settings = await getSiteSettings().catch(() => null);
  const compliance = settings?.compliance;

  return (
    <Section>
      <Container>
        <Prose className="space-y-8">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Disclosures
          </h1>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Plan availability</h2>
            <TpmoDisclaimer
              className="leading-relaxed"
              orgCount={compliance?.orgCount ?? undefined}
              planCount={compliance?.planCount ?? undefined}
            />
            <EnrollmentDisclaimer className="leading-relaxed" />
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Government affiliation</h2>
            <GovernmentDisclaimer className="leading-relaxed" />
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Licensing</h2>
            {compliance?.npn ? (
              <p>National Producer Number (NPN): {compliance.npn}</p>
            ) : null}
            {compliance?.stateLicenses?.length ? (
              <ul className="space-y-1">
                {compliance.stateLicenses.map((l, i) => (
                  <li key={i}>
                    {l.state}
                    {l.licenseNumber ? ` — licence ${l.licenseNumber}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                Licensing details are available on request.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              Nondiscrimination and language access
            </h2>
            <LanguageAccessNotice className="leading-relaxed" />
          </section>

          {compliance?.footerDisclosure ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Additional disclosures</h2>
              <p className="leading-relaxed whitespace-pre-line">
                {compliance.footerDisclosure}
              </p>
            </section>
          ) : null}
        </Prose>
      </Container>
    </Section>
  );
}
