import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, personSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { Monogram } from "@/components/ui/monogram";
import { team, teamMemberBySlug } from "@/content/team";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return team.map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = teamMemberBySlug(slug);
  if (!doc) return {};
  return { title: doc.name, description: `${doc.name} — ${doc.role}` };
}

export default async function TeamMemberPage({ params }: Props) {
  const { slug } = await params;
  const doc = teamMemberBySlug(slug);
  if (!doc) notFound();

  const photo = doc.photo;

  return (
    <Section>
      <JsonLd
        data={personSchema({ name: doc.name, role: doc.role, slug: doc.slug })}
      />
      <Container className="grid gap-10 md:grid-cols-[320px_1fr]">
        {photo ? (
          <Image
            src={photo.src}
            alt={photo.alt || `Portrait of ${doc.name}, ${doc.role}`}
            width={640}
            height={768}
            sizes="320px"
            className="aspect-[5/6] w-full rounded-(--radius-card) object-cover"
            priority
          />
        ) : (
          <Monogram
            name={doc.name}
            className="aspect-[5/6] w-full rounded-(--radius-card)"
            textClassName="text-6xl"
          />
        )}

        <div className="space-y-5">
          <div>
            <h1 className="font-display text-(length:--text-display-page)">
              {doc.name}
            </h1>
            <p className="lead text-muted text-lg">{doc.role}</p>
          </div>

          <RichTextBody>
            <p>{doc.bio}</p>
          </RichTextBody>

          {doc.licenses.length ? (
            <div className="space-y-2">
              <h2 className="text-base font-semibold">
                Licences and designations
              </h2>
              <ul className="text-muted space-y-1 text-base">
                {doc.licenses.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="space-y-2 text-base">
            {doc.phone ? (
              <li>
                <Button asChild variant="secondary" className="tabular">
                  <a href={`tel:${doc.phone.replace(/\D/g, "")}`}>
                    {doc.phone}
                  </a>
                </Button>
              </li>
            ) : null}
            {doc.email ? (
              <li>
                <Button asChild variant="secondary">
                  <a href={`mailto:${doc.email}`}>{doc.email}</a>
                </Button>
              </li>
            ) : null}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
