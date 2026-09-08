import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header, type NavItem } from "@/components/layout/header";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { announcementIsLive } from "@/lib/announcement";
import { SmoothScrollProvider } from "@/components/motion/smooth-scroll";
import { Analytics } from "@/components/analytics/consent";
import { getSiteSettings } from "@/lib/payload";

const FALLBACK_NAV: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Events", href: "/events" },
  { label: "Learning Center", href: "/learn" },
  { label: "Our Team", href: "/team" },
  { label: "Contact", href: "/contact" },
];

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSiteSettings().catch(() => null);
  const brand = process.env["BUSINESS_NAME"] ?? "Medicare Advisors";

  const nav = (
    settings?.nav?.length
      ? settings.nav.map((item) => ({
          label: item.label,
          href: item.href,
          children: item.children ?? undefined,
        }))
      : FALLBACK_NAV
  ) as NavItem[];

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Analytics gtmId={process.env["NEXT_PUBLIC_GTM_ID"]} />
      <SmoothScrollProvider />
      {announcementIsLive(settings?.announcement) ? (
        <AnnouncementBar
          text={settings!.announcement!.text!}
          linkLabel={settings?.announcement?.linkLabel}
          linkHref={settings?.announcement?.linkHref}
        />
      ) : null}
      <Header
        brand={brand}
        nav={nav}
        cta={settings?.cta ?? { label: "Get started", href: "/contact" }}
        clientPortal={settings?.clientPortal}
        phone={settings?.contact?.phone}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer
        brand={brand}
        phone={settings?.contact?.phone}
        email={settings?.contact?.email}
        address={settings?.contact?.address}
        orgCount={settings?.compliance?.orgCount}
        planCount={settings?.compliance?.planCount}
        npn={settings?.compliance?.npn}
        stateLicenses={settings?.compliance?.stateLicenses ?? undefined}
        extraDisclosure={settings?.compliance?.footerDisclosure}
      />
    </>
  );
}
