import type { Metadata } from "next";
import { Container, Prose, Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Our commitment to accessible content, the standard we build to, and how to tell us about a barrier.",
};

export default async function AccessibilityPage() {
  const settings = await getSiteSettings().catch(() => null);
  const phone = settings?.contact?.phone;
  const email = settings?.contact?.email;

  return (
    <Section>
      <Container>
        <Prose className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Accessibility
          </h1>
          <p className="text-lg leading-relaxed">
            We build this site to the Web Content Accessibility Guidelines
            (WCAG) 2.2 Level AA. Much of our audience uses screen readers,
            screen magnification, or keyboard navigation, so this is treated as
            a functional requirement rather than an afterthought.
          </p>

          <h2 className="text-xl font-semibold">What that means here</h2>
          <ul className="space-y-2 leading-relaxed">
            <li>
              Every page works with a keyboard alone, with a visible focus ring.
            </li>
            <li>
              Animation is suppressed entirely when your device requests reduced
              motion, and no content is hidden behind an animation.
            </li>
            <li>Form errors are announced and describe how to fix them.</li>
            <li>Text can be resized to 200% without loss of content.</li>
            <li>Automated accessibility checks run against every release.</li>
          </ul>

          <h2 className="text-xl font-semibold">Alternative formats</h2>
          <p className="leading-relaxed">
            We can provide any information on this site in large print, by
            phone, or in another language, free of charge. Auxiliary aids and
            language assistance services are available on request.
          </p>

          <h2 className="text-xl font-semibold">Tell us about a problem</h2>
          <p className="leading-relaxed">
            If something here is difficult or impossible to use, please tell us
            and we will fix it and help you directly in the meantime.
          </p>
          <ul className="space-y-1">
            {phone ? (
              <li>
                Phone:{" "}
                <a
                  className="underline underline-offset-4"
                  href={`tel:${phone.replace(/\D/g, "")}`}
                >
                  {phone}
                </a>{" "}
                (TTY 711)
              </li>
            ) : null}
            {email ? (
              <li>
                Email:{" "}
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${email}`}
                >
                  {email}
                </a>
              </li>
            ) : null}
          </ul>
        </Prose>
      </Container>
    </Section>
  );
}
