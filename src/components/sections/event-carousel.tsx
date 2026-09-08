"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Container } from "@/components/ui/section";
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

/**
 * Events slider, matching the pattern on greatwatersfinancial.com (Swiper
 * there, Embla here). Arrows and dots are real buttons with labels, and the
 * track is a labelled group so keyboard and screen-reader users can move
 * through it — carousels are the most commonly inaccessible component on
 * sites of this type.
 */
export function EventCarousel({
  heading,
  events,
}: {
  heading?: string | null;
  events: EventItem[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const [selected, setSelected] = useState(0);

  // Derived during render rather than synced into state from an effect, which
  // would cause a cascading render on mount.
  const snaps = emblaApi ? emblaApi.scrollSnapList() : [];

  useEffect(() => {
    if (!emblaApi) return;
    // setState here runs from Embla's event, not synchronously in the effect.
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (events.length === 0) return null;

  return (
    <Container className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id="events-heading"
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {heading ?? "Upcoming events"}
        </h2>
        <Link
          href="/events"
          className="text-sm font-semibold underline underline-offset-4"
        >
          View all events
        </Link>
      </div>

      <div
        className="overflow-hidden"
        ref={emblaRef}
        role="group"
        aria-roledescription="carousel"
        aria-labelledby="events-heading"
      >
        <ul className="flex gap-6">
          {events.map((event) => (
            <li
              key={event.id}
              className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <Card className="h-full">
                <EventImage image={event.image} cost={event.cost} />
                <CardBody>
                  <p className="text-muted flex items-center gap-2 text-sm">
                    <CalendarDays aria-hidden className="size-4" />
                    <time dateTime={event.startsAt}>
                      {formatDate(event.startsAt)} ·{" "}
                      {formatTime(event.startsAt)}
                    </time>
                  </p>
                  <p className="text-muted flex items-center gap-2 text-sm">
                    <MapPin aria-hidden className="size-4" />
                    {event.venue}
                  </p>
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <p className="text-muted flex-1 text-sm">{event.summary}</p>
                  <Link
                    href={`/events/${event.slug}`}
                    className="text-sm font-semibold underline underline-offset-4"
                  >
                    View event
                    <span className="sr-only">: {event.title}</span>
                  </Link>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {snaps.length > 1 ? (
        <div className="flex items-center justify-between">
          <ul className="flex gap-2">
            {snaps.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Go to slide ${i + 1} of ${snaps.length}`}
                  aria-current={selected === i}
                  // The dot is small for visual reasons, but the button itself
                  // must be at least 24x24 to meet WCAG 2.2 target size.
                  className="grid size-6 place-items-center rounded-full"
                >
                  <span
                    aria-hidden
                    className={
                      selected === i
                        ? "bg-on-surface block size-2.5 rounded-full"
                        : "bg-on-surface/30 block size-2.5 rounded-full"
                    }
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous events"
              className="border-border-subtle grid size-11 place-items-center rounded-full border"
            >
              <ArrowLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next events"
              className="border-border-subtle grid size-11 place-items-center rounded-full border"
            >
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
