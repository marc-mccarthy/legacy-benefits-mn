import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { EventImage } from "@/components/sections/event-image";
import { Container, Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { getUpcomingEvents } from "@/lib/payload";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Free educational Medicare workshops and community events. No obligation to enrol.",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents(50).catch(() => []);

  return (
    <Section>
      <Container className="space-y-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Upcoming events
          </h1>
          <p className="text-muted text-lg">
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
                <Reveal delay={Math.min(i * 0.05, 0.3)} className="flex w-full">
                  <Card className="w-full">
                    <EventImage image={event.image} cost={event.cost} />
                    <CardBody>
                      <time
                        dateTime={event.startsAt}
                        className="text-muted text-sm"
                      >
                        {formatDate(event.startsAt)} ·{" "}
                        {formatTime(event.startsAt)}
                      </time>
                      <p className="text-muted text-sm">{event.venue}</p>
                      <h2 className="text-lg font-semibold">
                        <Link
                          href={`/events/${event.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {event.title}
                        </Link>
                      </h2>
                      <p className="text-muted flex-1 text-sm">
                        {event.summary}
                      </p>
                    </CardBody>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  );
}
