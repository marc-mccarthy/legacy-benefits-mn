import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container, Prose, Section } from "@/components/ui/section";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, eventSchema } from "@/components/seo/json-ld";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { getDocBySlug, getSiteSettings } from "@/lib/payload";
import { formatDate, formatTime } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug("events", slug).catch(() => null);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const [doc, settings] = await Promise.all([
    getDocBySlug("events", slug).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  if (!doc) notFound();

  return (
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
      <Container>
        <Prose className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {doc.title}
          </h1>

          <dl className="text-muted grid gap-2 text-base sm:grid-cols-2">
            <div>
              <dt className="font-semibold">When</dt>
              <dd>
                <time dateTime={doc.startsAt}>
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

          <p className="text-lg leading-relaxed">{doc.summary}</p>
          <RichTextBody data={doc.body} />

          {doc.registrationUrl ? (
            <Button asChild size="lg">
              <a href={doc.registrationUrl}>Register for this event</a>
            </Button>
          ) : null}

          <p className="text-muted text-sm">
            For accommodation of persons with special needs at meetings, please
            contact us. TTY users may dial 711.
          </p>

          <TpmoDisclaimer
            className="text-muted border-border-subtle border-t pt-6 leading-relaxed"
            orgCount={settings?.compliance?.orgCount ?? undefined}
            planCount={settings?.compliance?.planCount ?? undefined}
          />
        </Prose>
      </Container>
    </Section>
  );
}
