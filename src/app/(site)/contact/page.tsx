import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { CalendlyInline } from "@/components/integrations/calendly";
import { Container, Prose, Section } from "@/components/ui/section";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { tcpaConsentText } from "@/lib/compliance/disclosures";
import { getSiteSettings } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Contact a licensed agent",
  description:
    "Ask a licensed Medicare agent a question, or request a call at a time that suits you.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings().catch(() => null);
  const brand =
    settings?.businessName ?? process.env["BUSINESS_NAME"] ?? "this agency";
  const phone = settings?.contact?.phone ?? process.env["BUSINESS_PHONE"];
  const calendlyUrl = process.env["NEXT_PUBLIC_CALENDLY_URL"];

  return (
    <Section>
      <Container className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <Prose className="space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Talk to a licensed agent
          </h1>
          <p className="text-muted text-lg">
            Tell us what you are trying to sort out and we will call you back.
            There is no cost, and no obligation to enrol in anything.
          </p>
          {phone ? (
            <p className="text-lg">
              Prefer to call?{" "}
              <a
                className="font-semibold underline underline-offset-4"
                href={`tel:${phone.replace(/\D/g, "")}`}
              >
                {phone}
              </a>{" "}
              <span className="text-muted">(TTY 711)</span>
            </p>
          ) : null}
          <TpmoDisclaimer
            className="text-muted border-border-subtle border-t pt-5 text-sm leading-relaxed"
            orgCount={settings?.compliance?.orgCount ?? undefined}
            planCount={settings?.compliance?.planCount ?? undefined}
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
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            Or pick a time that suits you
          </h2>
          <CalendlyInline url={calendlyUrl} />
        </Container>
      ) : null}
    </Section>
  );
}
