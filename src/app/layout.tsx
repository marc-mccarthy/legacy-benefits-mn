import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import {
  Archivo,
  Atkinson_Hyperlegible_Next as AtkinsonHyperlegibleNext,
} from "next/font/google";
import "./globals.css";
import { getBusinessIdentity } from "@/lib/business";
import { getSiteUrl } from "@/lib/site-url";

const atkinson = AtkinsonHyperlegibleNext({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#081A3A",
};

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getBusinessIdentity().catch(() => ({
    name: "Legacy Benefits Group",
  }));

  return {
    metadataBase: new URL(getSiteUrl()),
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
      className={`${atkinson.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`,
          }}
        />
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;clip-path:none !important}`}</style>
        </noscript>
      </head>
      <body className="bg-surface text-on-surface flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
