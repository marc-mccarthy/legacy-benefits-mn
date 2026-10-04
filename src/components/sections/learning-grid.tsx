import { Image } from "@/components/ui/image";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/components/ui/card";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { CoverMotion } from "@/components/motion/cover-motion";
import { Morph } from "@/components/motion/morph";
import { Reveal } from "@/components/motion/reveal";
import { mediaProps } from "@/lib/media";
import { formatDate } from "@/lib/utils";

export type ArticleItem = {
  id: number | string;
  title: string;
  slug: string;
  excerpt: string;
  type: "article" | "tool" | "video";
  publishedAt: string;
  coverImage?: unknown;
};

const TYPE_LABEL: Record<ArticleItem["type"], string> = {
  article: "Article",
  tool: "Tool",
  video: "Video",
};

const TYPE_PANEL: Record<ArticleItem["type"], string> = {
  article: "bg-ground-black text-ink-dark",
  tool: "bg-ground-dark text-ink-dark",
  video: "bg-ground-dark text-ink-dark",
};

export function LearningFilters({
  active,
  basePath = "/learn",
}: {
  active?: string;
  basePath?: string;
}) {
  const options = [
    { value: undefined, label: "All" },
    { value: "article", label: "Articles" },
    { value: "tool", label: "Tools" },
    { value: "video", label: "Videos" },
  ];

  return (
    <nav aria-label="Filter resources by type">
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isActive = active === o.value || (!active && !o.value);
          return (
            <li key={o.label}>
              <Link
                href={o.value ? `${basePath}?type=${o.value}` : basePath}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "bg-on-surface text-surface inline-flex min-h-11 items-center rounded-full px-5 text-base font-semibold"
                    : "border-border-subtle inline-flex min-h-11 items-center rounded-full border px-5 text-base font-semibold"
                }
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LearningGrid({
  heading,
  intro,
  articles,
  scheme = "muted",
  showFilters = false,
  activeType,
}: {
  heading?: string | null;
  intro?: string | null;
  articles: ArticleItem[];
  scheme?: Scheme;
  showFilters?: boolean;
  activeType?: string;
}) {
  return (
    <Section scheme={scheme} aria-labelledby="learn-heading">
      <Container className="space-y-8">
        <Reveal className="max-w-2xl space-y-4">
          <h2
            id="learn-heading"
            className="font-display text-(length:--text-display-lg)"
          >
            {heading ?? "Learning center"}
          </h2>
          {intro ? <p className="lead text-muted text-lg">{intro}</p> : null}
        </Reveal>

        {showFilters ? <LearningFilters active={activeType} /> : null}

        {articles.length === 0 ? (
          <p className="text-muted">No resources here yet. Check back soon.</p>
        ) : (
          <Reveal>
            <ul className="grid gap-6 md:grid-cols-3">
              {articles.map((article) => {
                const cover = mediaProps(article.coverImage as never);
                return (
                  <li
                    key={article.id}
                    data-article-type={article.type}
                    className="flex"
                  >
                    <Card className="w-full">
                      {cover ? (
                        <div className="aspect-[16/10] w-full overflow-hidden">
                          <CoverMotion>
                            <Morph kind="learn" slug={article.slug}>
                              <Image
                                src={cover.src}
                                alt={cover.alt}
                                width={cover.width}
                                height={cover.height}
                                className="size-full object-cover"
                                sizes="(min-width: 768px) 33vw, 100vw"
                              />
                            </Morph>
                          </CoverMotion>
                        </div>
                      ) : (
                        <div
                          aria-hidden
                          className={`grid aspect-[16/10] w-full place-items-center ${TYPE_PANEL[article.type]}`}
                        >
                          <span className="text-2xl font-semibold tracking-tight">
                            {TYPE_LABEL[article.type]}
                          </span>
                        </div>
                      )}
                      <CardBody>
                        <Badge>{TYPE_LABEL[article.type]}</Badge>
                        <h3 className="text-lg font-semibold">
                          <Link
                            href={`/learn/${article.slug}`}
                            className="flex min-h-11 items-center after:absolute after:inset-0"
                          >
                            {article.title}
                          </Link>
                        </h3>
                        <p className="text-muted flex-1">{article.excerpt}</p>
                        <time
                          dateTime={article.publishedAt}
                          className="text-muted text-base"
                        >
                          {formatDate(article.publishedAt)}
                        </time>
                      </CardBody>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}
