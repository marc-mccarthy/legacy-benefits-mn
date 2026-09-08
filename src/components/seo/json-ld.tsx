/**
 * Structured data. Uses InsuranceAgency rather than FinancialService — the
 * schema.org type has to match the actual business, and a Medicare agency is
 * not a securities firm.
 */

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Payload is built server-side from our own content, never user input.
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

export function eventSchema(opts: {
  title: string;
  description: string;
  slug: string;
  startsAt: string;
  endsAt?: string | null;
  venue: string;
  address?: string | null;
  isFree: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opts.title,
    description: opts.description,
    startDate: opts.startsAt,
    ...(opts.endsAt ? { endDate: opts.endsAt } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: opts.venue,
      ...(opts.address ? { address: opts.address } : {}),
    },
    url: `${siteUrl()}/events/${opts.slug}`,
    offers: {
      "@type": "Offer",
      price: opts.isFree ? "0" : undefined,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

export function personSchema(opts: {
  name: string;
  role: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
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
