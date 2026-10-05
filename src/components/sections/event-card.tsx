import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import { EventImage } from "./event-image";

export type EventItem = {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
  startsAt: string;
  venue: string;
  cost: "free" | "paid";
  image?: unknown;
};

export function EventCard({
  event,
  headingLevel,
  className,
}: {
  event: EventItem;
  headingLevel: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;

  return (
    <Card className={className}>
      <EventImage
        image={event.image}
        cost={event.cost}
        morphSlug={event.slug}
      />
      <CardBody>
        <p className="text-muted flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4" />
          <time className="tabular" dateTime={event.startsAt}>
            {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
          </time>
        </p>
        <p className="text-muted flex items-center gap-2">
          <MapPin aria-hidden className="size-4" />
          {event.venue}
        </p>
        <Heading className="text-lg font-semibold">{event.title}</Heading>
        <p className="text-muted flex-1">{event.summary}</p>
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 after:absolute after:inset-0"
        >
          View event
          <span className="sr-only">: {event.title}</span>
        </Link>
      </CardBody>
    </Card>
  );
}
