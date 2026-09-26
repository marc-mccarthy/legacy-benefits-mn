"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/section";
import { EventCard, type EventItem } from "./event-card";

export type { EventItem };

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

  const snaps = emblaApi ? emblaApi.scrollSnapList() : [];

  useEffect(() => {
    if (!emblaApi) return;
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
          className="font-display text-(length:--text-display-lg)"
        >
          {heading ?? "Upcoming events"}
        </h2>
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
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
              <EventCard event={event} headingLevel="h3" className="h-full" />
            </li>
          ))}
        </ul>
      </div>

      {snaps.length > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ul className="flex">
              {snaps.map((_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Go to slide ${i + 1} of ${snaps.length}`}
                    aria-current={selected === i}
                    className="grid size-11 place-items-center rounded-full"
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
            <p aria-hidden className="text-muted">
              {selected + 1} of {snaps.length}
            </p>
          </div>
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
