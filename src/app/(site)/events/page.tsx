import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/sections/event-card";
import { Container, Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { upcomingEvents } from "@/content/events";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Free educational Medicare workshops and community events. No obligation to enrol.",
};

export default function EventsPage() {
  const events = upcomingEvents(new Date()).slice(0, 50);

  return (
    <Section>
      <Container className="space-y-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            Upcoming events
          </h1>
          <p className="lead text-muted text-lg">
            Educational sessions on how Medicare works. Attending does not enrol
            you in a plan and carries no obligation.
          </p>
        </div>

        {events.length === 0 ? (
          <p className="text-muted">
            No events are scheduled right now. Check back soon, or{" "}
            <Link href="/contact" className="underline underline-offset-4">
              ask to be told when the next one is announced
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-3">
            {events.map((event, i) => (
              <li key={event.id} className="flex">
                <Reveal
                  delay={Math.min(i * 0.05, 0.15)}
                  className="flex w-full"
                >
                  <EventCard
                    event={event}
                    headingLevel="h2"
                    className="w-full"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  );
}
