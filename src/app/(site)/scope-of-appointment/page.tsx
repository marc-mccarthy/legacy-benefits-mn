import type { Metadata } from "next";
import { SoaForm } from "@/components/forms/soa-form";
import { Container, Prose, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Scope of Appointment",
  description:
    "Complete your Scope of Appointment before a Medicare plan discussion. It records which product types you agreed to discuss.",
};

export default function ScopeOfAppointmentPage() {
  return (
    <Section>
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <Prose className="fade-in space-y-5">
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            Scope of Appointment
          </h1>
          <p className="lead text-muted text-lg">
            Medicare rules require us to document which types of plans you have
            agreed to discuss before we meet. It takes a minute, and it protects
            you: we may only talk about what you tick below.
          </p>
          <ul className="text-muted space-y-2">
            <li>This does not enrol you in any plan.</li>
            <li>It does not change your current coverage.</li>
            <li>
              You can change the scope at any time, including at the start of
              the meeting.
            </li>
            <li>We keep a copy on file and can send it to you on request.</li>
          </ul>
        </Prose>

        <div>
          <SoaForm
            turnstileSiteKey={process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]}
          />
        </div>
      </Container>
    </Section>
  );
}
