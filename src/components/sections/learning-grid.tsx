import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/components/ui/card";
import { Container, Section, type Scheme } from "@/components/ui/section";
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

/** Fallback panel styling per resource type, mirroring the colour-blocked
 *  cards measured on greatwatersfinancial.com. */
const TYPE_PANEL: Record<ArticleItem["type"], string> = {
  article: "bg-navy-800 text-white",
  tool: "bg-gold-500 text-navy-900",
  video: "bg-navy-600 text-white",
};

/** Filter chips. Rendered as links so filtering works without JavaScript and
 *  each filtered view is a real, shareable URL. */
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
                    ? "bg-on-surface text-surface rounded-full px-4 py-2 text-sm font-semibold"
                    : "border-border-subtle rounded-full border px-4 py-2 text-sm font-semibold"
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
            className="text-3xl font-semibold tracking-tight md:text-5xl"
          >
            {heading ?? "Learning center"}
          </h2>
          {intro ? <p className="text-muted text-lg">{intro}</p> : null}
        </Reveal>

        {showFilters ? <LearningFilters active={activeType} /> : null}

        {articles.length === 0 ? (
          <p className="text-muted">No resources here yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-3">
            {articles.map((article, i) => {
              const cover = mediaProps(article.coverImage as never);
              return (
                <li key={article.id} className="flex">
                  <Reveal
                    delay={Math.min(i * 0.06, 0.3)}
                    className="flex w-full"
                  >
                    <Card className="w-full">
                      {cover ? (
                        <div className="aspect-[16/10] w-full overflow-hidden">
                          <Image
                            src={cover.src}
                            alt={cover.alt}
                            width={cover.width}
                            height={cover.height}
                            className="size-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                            sizes="(min-width: 768px) 33vw, 100vw"
                          />
                        </div>
                      ) : (
                        // No cover uploaded: a brand-colour panel with the
                        // resource type, rather than a ragged empty card.
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
                            className="after:absolute after:inset-0"
                          >
                            {article.title}
                          </Link>
                        </h3>
                        <p className="text-muted flex-1 text-sm">
                          {article.excerpt}
                        </p>
                        <time
                          dateTime={article.publishedAt}
                          className="text-muted text-xs"
                        >
                          {formatDate(article.publishedAt)}
                        </time>
                      </CardBody>
                    </Card>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </Section>
  );
}
