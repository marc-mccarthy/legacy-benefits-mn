import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { getBusinessIdentity } from "@/lib/business";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Display face, used only at 36px and above.
 *
 * Newsreader is optical-size aware and holds moderate stroke contrast, which
 * is the point: high-contrast display serifs (Playfair, Instrument) thin to
 * hairlines that older eyes lose entirely, and that is a legibility failure no
 * contrast ratio catches.
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

/**
 * Titles follow the business name from the CMS, so renaming the practice does
 * not leave a stale name in every browser tab and search result.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getBusinessIdentity().catch(() => ({
    name: "Medicare Advisors",
  }));

  return {
    title: {
      default: `${name} — Medicare Plans & Guidance`,
      template: `%s | ${name}`,
    },
    description:
      "Independent, licensed Medicare guidance — plan comparisons, enrollment help, and ongoing support.",
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        {/* Consent Mode v2 defaults. Everything denied until the visitor opts
            in. This must execute before the tag manager loads, so it is an
            inline script in <head> rather than a next/script component. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`,
          }}
        />
        {/* Scroll-reveal wrappers are server-rendered with inline opacity: 0.
            Without JavaScript nothing would ever reveal them, so force them
            visible. An insurance site must never render an empty page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="bg-surface text-on-surface flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
