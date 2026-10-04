import type { Metadata } from "next";
import { CalendarPlus, MapPin } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container, Prose, Section } from "@/components/ui/section";
import { PageBand } from "@/components/sections/page-band";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, eventSchema } from "@/components/seo/json-ld";
import { Morph } from "@/components/motion/morph";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { eventBySlug, events } from "@/content/events";
import { site } from "@/content/site";
import { formatDate, formatTime } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = eventBySlug(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const doc = eventBySlug(slug);

  if (!doc) notFound();

  const photo = doc.image;

  return (
    <>
      <PageBand title={doc.title} />
      <Section>
        <JsonLd
          data={eventSchema({
            title: doc.title,
            description: doc.summary,
            slug: doc.slug,
            startsAt: doc.startsAt,
            endsAt: doc.endsAt,
            venue: doc.venue,
            address: doc.address,
            isFree: doc.cost === "free",
          })}
        />
        <nav
          aria-label="Event actions"
          className="bg-action fixed inset-x-0 bottom-0 z-40 flex pb-[env(safe-area-inset-bottom)] min-[700px]:hidden print:hidden"
        >
          <a
            href={`/events/${doc.slug}/event.ics`}
            className="text-on-action flex min-h-12 w-1/2 items-center justify-center gap-2 text-base font-semibold"
          >
            <CalendarPlus aria-hidden="true" className="size-5" />
            Add to calendar
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doc.address ?? doc.venue)}`}
            className="text-on-action border-on-action/40 flex min-h-12 w-1/2 items-center justify-center gap-2 border-l text-base font-semibold"
          >
            <MapPin aria-hidden="true" className="size-5" />
            Get directions
          </a>
        </nav>
        <Container className="space-y-8 pb-24 min-[700px]:pb-0">
          {photo ? (
            <Morph kind="event" slug={doc.slug}>
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(min-width: 1152px) 72rem, 100vw"
                className="aspect-[21/9] w-full rounded-(--radius-card) object-cover"
                priority
              />
            </Morph>
          ) : (
            <p className="text-muted border-border-subtle tabular border-y py-6 text-base">
              {formatDate(doc.startsAt, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {doc.venue}
            </p>
          )}

          <Prose className="space-y-6">
            <dl className="text-muted grid gap-2 text-base sm:grid-cols-2">
              <div>
                <dt className="font-semibold">When</dt>
                <dd>
                  <time className="tabular" dateTime={doc.startsAt}>
                    {formatDate(doc.startsAt, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    , {formatTime(doc.startsAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Where</dt>
                <dd className="whitespace-pre-line">
                  {doc.venue}
                  {doc.address ? `\n${doc.address}` : ""}
                </dd>
              </div>
            </dl>

            <p className="lead text-lg leading-relaxed">{doc.summary}</p>
            <RichTextBody>
              <p>{doc.body}</p>
            </RichTextBody>

            {doc.registrationUrl ? (
              <Button asChild size="lg">
                <a href={doc.registrationUrl}>Register for this event</a>
              </Button>
            ) : null}

            <p className="text-muted text-base">
              For accommodation of persons with special needs at meetings,
              please contact us. TTY users may dial 711.
            </p>

            <TpmoDisclaimer
              className="text-muted border-border-subtle border-t pt-6 leading-relaxed"
              orgCount={site.compliance.orgCount ?? undefined}
              planCount={site.compliance.planCount ?? undefined}
            />
          </Prose>
        </Container>
      </Section>
    </>
  );
}
