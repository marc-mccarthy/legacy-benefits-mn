import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Medicare Planning & Insurance Advice",
    template: "%s | Medicare Planning & Insurance Advice",
  },
  description:
    "Independent Medicare and insurance guidance — plan comparisons, enrollment help, and ongoing support.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
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
