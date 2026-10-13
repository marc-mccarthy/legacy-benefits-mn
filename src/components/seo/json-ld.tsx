import type { Credential } from "@/content/types";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const siteUrl = () =>
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export function organizationSchema(opts: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: opts.name,
    url: siteUrl(),
    ...(opts.phone ? { telephone: opts.phone } : {}),
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.address ? { address: opts.address } : {}),
    areaServed: "US",
    knowsAbout: [
      "Medicare Advantage",
      "Medicare Supplement",
      "Medicare Part D",
    ],
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    datePublished: opts.publishedAt,
    url: `${siteUrl()}/learn/${opts.slug}`,
    ...(opts.authorName
      ? { author: { "@type": "Person", name: opts.authorName } }
      : {}),
  };
}

export function personSchema(opts: {
  name: string;
  credential: Credential | null;
  role: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    ...(opts.credential
      ? {
          honorificSuffix: opts.credential.short,
          hasCredential: {
            "@type": "EducationalOccupationalCredential",
            name: opts.credential.full,
            credentialCategory: "certification",
          },
        }
      : {}),
    jobTitle: opts.role,
    url: `${siteUrl()}/team/${opts.slug}`,
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}
