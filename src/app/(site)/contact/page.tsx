import type { Metadata } from "next";
import Image from "next/image";
import { ContactForm } from "@/components/forms/contact-form";
import { CalendlyInline } from "@/components/integrations/calendly";
import { Container, Prose, Section } from "@/components/ui/section";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { tcpaConsentText } from "@/lib/compliance/disclosures";
import { site } from "@/content/site";
import { media } from "@/content/media";
import { team } from "@/content/team";
import { getBusinessIdentity } from "@/lib/business";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact a licensed agent",
  description:
    "Ask a licensed Medicare agent a question, or request a call at a time that suits you.",
};

export default async function ContactPage() {
  const identity = await getBusinessIdentity();
  const brand = identity.name;
  const phone = identity.phone;
  const calendlyUrl = env("NEXT_PUBLIC_CALENDLY_URL");
  const nate = team[0];
  const chip = media["nate.chip"];

  return (
    <Section>
      <Container className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <Prose className="fade-in space-y-5">
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            Talk to a licensed agent
          </h1>
          <div className="flex items-center gap-4">
            <Image
              src={chip.src}
              alt={chip.alt}
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-full object-cover"
            />
            <p className="text-lg font-semibold">
              {nate?.name}, {nate?.role}
            </p>
          </div>
          {phone ? (
            <p>
              <a
                className="tabular font-display inline-flex min-h-11 items-center text-(length:--text-display-lg) font-semibold underline underline-offset-4"
                href={`tel:${phone.replace(/\D/g, "")}`}
              >
                {phone}
              </a>{" "}
              <span className="text-muted text-lg">(TTY&nbsp;711)</span>
            </p>
          ) : null}
          <p className="lead text-muted text-lg">
            Tell us what you are trying to sort out and we will call you back.
            There is no cost, and no obligation to enrol in anything.
          </p>
          <TpmoDisclaimer
            className="text-muted border-border-subtle border-t pt-5 leading-relaxed"
            orgCount={site.compliance.orgCount ?? undefined}
            planCount={site.compliance.planCount ?? undefined}
          />
        </Prose>

        <div>
          <ContactForm
            consentText={tcpaConsentText(brand, phone ?? undefined)}
          />
        </div>
      </Container>

      {calendlyUrl ? (
        <Container className="mt-(--spacing-large)">
          <h2 className="font-display mb-6 text-(length:--text-display-lg)">
            Or pick a time that suits you
          </h2>
          <CalendlyInline url={calendlyUrl} />
        </Container>
      ) : null}
    </Section>
  );
}
