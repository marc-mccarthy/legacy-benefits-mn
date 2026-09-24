import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, Prose, Section } from "@/components/ui/section";
import { RichTextBody } from "@/components/sections/rich-text";
import { JsonLd, articleSchema } from "@/components/seo/json-ld";
import { Morph } from "@/components/motion/morph";
import { TpmoDisclaimer } from "@/components/compliance/disclosures";
import { articleBySlug, articles } from "@/content/articles";
import { site } from "@/content/site";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = articleBySlug(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.excerpt };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const doc = articleBySlug(slug);

  if (!doc) notFound();

  const cover = doc.coverImage;
  const Body = doc.Body;

  return (
    <Section>
      <JsonLd
        data={articleSchema({
          title: doc.title,
          description: doc.excerpt,
          slug: doc.slug,
          publishedAt: doc.publishedAt,
        })}
      />
      <Container>
        <Prose className="space-y-6">
          <p className="text-muted tabular text-base">
            <time dateTime={doc.publishedAt}>
              {formatDate(doc.publishedAt)}
            </time>
          </p>
          <h1 className="font-display text-(length:--text-display-page)">
            {doc.title}
          </h1>
          <p className="lead text-muted text-lg leading-relaxed">
            {doc.excerpt}
          </p>

          {cover ? (
            <Morph kind="learn" slug={doc.slug}>
              <Image
                src={cover.src}
                alt={cover.alt}
                width={cover.width}
                height={cover.height}
                sizes="(min-width: 1024px) 52rem, 100vw"
                className="w-full rounded-(--radius-card)"
                priority
              />
            </Morph>
          ) : null}

          <RichTextBody>
            <Body />
          </RichTextBody>

          <TpmoDisclaimer
            className="text-muted border-border-subtle border-t pt-6 leading-relaxed"
            orgCount={site.compliance.orgCount ?? undefined}
            planCount={site.compliance.planCount ?? undefined}
          />
        </Prose>
      </Container>
    </Section>
  );
}
