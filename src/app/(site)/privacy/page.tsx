import type { Metadata } from "next";
import Link from "next/link";
import { Container, Prose, Section } from "@/components/ui/section";
import { RECORD_RETENTION_YEARS } from "@/lib/compliance/disclosures";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What personal information we collect, why we collect it, how long we keep it, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <Section>
      <Container>
        <Prose className="space-y-6">
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            Privacy Policy
          </h1>

          <h2 className="font-display text-(length:--text-display-lg)">
            What we collect
          </h2>
          <p className="leading-relaxed">
            When you submit a form we collect the details you give us — your
            name, contact details, ZIP code, the type of coverage you are asking
            about, and anything you write in the message box. We also record the
            page you submitted from, any campaign parameters in the link you
            arrived through, the date and time, and a one-way hash of your IP
            address. We do not store your raw IP address.
          </p>

          <h2 className="font-display text-(length:--text-display-lg)">
            Consent records
          </h2>
          <p className="leading-relaxed">
            If you tick the consent box, we store the exact wording you were
            shown along with the timestamp. This is how we demonstrate that
            consent was given for a specific purpose, and it is also what lets
            us show you precisely what you agreed to.
          </p>

          <h2 className="font-display text-(length:--text-display-lg)">
            How long we keep it
          </h2>
          <p className="leading-relaxed">
            Medicare marketing records, including Scope of Appointment forms,
            are retained for {RECORD_RETENTION_YEARS} years as required by the
            Centers for Medicare &amp; Medicaid Services. Suppression records —
            requests not to be contacted — are kept indefinitely, because we
            need them to keep honoring your request.
          </p>

          <h2 className="font-display text-(length:--text-display-lg)">
            Who we share it with
          </h2>
          <p className="leading-relaxed">
            Your inquiry is stored in our customer relationship management
            system so a licensed agent can follow up. We do not sell your
            personal information. Analytics on this site are configured to
            exclude the contents of forms.
          </p>

          <h2 className="font-display text-(length:--text-display-lg)">
            Your choices
          </h2>
          <p className="leading-relaxed">
            You can withdraw consent, opt out of sharing, or ask us to delete
            your information at any time using the{" "}
            <Link
              href="/do-not-contact"
              className="underline underline-offset-4"
            >
              do not contact form
            </Link>
            , or by replying STOP to any text message. If your browser sends a
            Global Privacy Control signal, we treat that as an opt-out of the
            sale or sharing of personal information automatically.
          </p>

          <h2 className="font-display text-(length:--text-display-lg)">
            Security
          </h2>
          <p className="leading-relaxed">
            Data is encrypted in transit and at rest. Access to the underlying
            database is restricted to the application and named administrators.
          </p>
        </Prose>
      </Container>
    </Section>
  );
}
