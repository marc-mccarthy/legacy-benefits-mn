import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, Prose, Section } from "@/components/ui/section";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, articleSchema } from "@/components/seo/json-ld";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { getDocBySlug, getSiteSettings } from "@/lib/payload";
import { mediaProps } from "@/lib/media";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug("articles", slug).catch(() => null);
  if (!doc) return {};
  return { title: doc.title, description: doc.excerpt };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [doc, settings] = await Promise.all([
    getDocBySlug("articles", slug).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  if (!doc) notFound();

  const cover = mediaProps(doc.coverImage as never);
  const author =
    doc.author && typeof doc.author === "object" ? doc.author.name : undefined;

  return (
    <Section>
      <JsonLd
        data={articleSchema({
          title: doc.title,
          description: doc.excerpt,
          slug: doc.slug,
          publishedAt: doc.publishedAt,
          authorName: author,
        })}
      />
      <Container>
        <Prose className="space-y-6">
          <p className="text-muted text-sm">
            <time dateTime={doc.publishedAt}>
              {formatDate(doc.publishedAt)}
            </time>
            {author ? ` · ${author}` : ""}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {doc.title}
          </h1>
          <p className="text-muted text-lg leading-relaxed">{doc.excerpt}</p>

          {cover ? (
            <Image
              src={cover.src}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              sizes="(min-width: 1024px) 52rem, 100vw"
              className="w-full rounded-(--radius-card)"
              priority
            />
          ) : null}

          <RichTextBody data={doc.body} />

          <TpmoDisclaimer
            className="text-muted border-border-subtle border-t pt-6 text-sm leading-relaxed"
            orgCount={settings?.compliance?.orgCount ?? undefined}
            planCount={settings?.compliance?.planCount ?? undefined}
          />
        </Prose>
      </Container>
    </Section>
  );
}
