import type { Metadata } from "next";
import { DncForm } from "@/components/forms/dnc-form";
import { Container, Prose, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Do not contact / Do not sell my information",
  description:
    "Ask us to stop contacting you, or to delete or stop sharing your personal information.",
};

export default function DoNotContactPage() {
  return (
    <Section>
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <Prose className="space-y-5">
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            Stop contact or remove my information
          </h1>
          <p className="lead text-muted text-lg">
            Use this form to withdraw consent to be contacted, to opt out of the
            sale or sharing of your personal information, or to ask us to delete
            what we hold about you.
          </p>
          <p className="text-muted">
            You can also reply STOP to any text message from us. We honour
            Global Privacy Control signals sent by your browser automatically.
          </p>
        </Prose>

        <div>
          <DncForm />
        </div>
      </Container>
    </Section>
  );
}
