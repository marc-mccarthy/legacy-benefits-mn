import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, personSchema } from "@/components/seo/json-ld";
import { Container, Section } from "@/components/ui/section";
import { getDocBySlug } from "@/lib/payload";
import { mediaProps } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug("team", slug).catch(() => null);
  if (!doc) return {};
  return { title: doc.name, description: `${doc.name} — ${doc.role}` };
}

export default async function TeamMemberPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getDocBySlug("team", slug).catch(() => null);
  if (!doc) notFound();

  const photo = mediaProps(doc.headshot as never);

  return (
    <Section>
      <JsonLd
        data={personSchema({ name: doc.name, role: doc.role, slug: doc.slug })}
      />
      <Container className="grid gap-10 md:grid-cols-[320px_1fr]">
        {photo ? (
          <Image
            src={photo.src}
            alt={doc.name}
            width={640}
            height={768}
            sizes="320px"
            className="aspect-[5/6] w-full rounded-(--radius-card) object-cover"
            priority
          />
        ) : null}

        <div className="space-y-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              {doc.name}
            </h1>
            <p className="text-muted text-lg">{doc.role}</p>
          </div>

          <RichTextBody data={doc.bio} />

          {doc.licenses?.length ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wide uppercase">
                Licences and designations
              </h2>
              <ul className="text-muted space-y-1 text-sm">
                {doc.licenses.map((l, i) => (
                  <li key={i}>{l.label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="space-y-1 text-sm">
            {doc.phone ? (
              <li>
                <a
                  className="underline underline-offset-4"
                  href={`tel:${doc.phone.replace(/\D/g, "")}`}
                >
                  {doc.phone}
                </a>
              </li>
            ) : null}
            {doc.email ? (
              <li>
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${doc.email}`}
                >
                  {doc.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
