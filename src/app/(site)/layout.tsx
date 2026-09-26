import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { AnnouncementLive } from "@/components/layout/announcement-live";
import { announcementIsLive } from "@/lib/announcement";
import { Analytics } from "@/components/analytics/consent";
import { PageTransition } from "@/components/motion/page-transition";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { site } from "@/content/site";
import { getBusinessIdentity } from "@/lib/business";
import { env } from "@/lib/env";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const identity = await getBusinessIdentity();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Analytics gtmId={env("NEXT_PUBLIC_GTM_ID")} />
      <SmoothScroll />
      {announcementIsLive(site.announcement) ? (
        <AnnouncementLive announcement={site.announcement}>
          <AnnouncementBar
            text={site.announcement.text!}
            linkLabel={site.announcement.linkLabel}
            linkHref={site.announcement.linkHref}
          />
        </AnnouncementLive>
      ) : null}
      <Header
        brand={identity.name}
        nav={site.nav}
        cta={site.cta}
        clientPortal={site.clientPortal}
        phone={identity.phone}
      />
      <PageTransition>
        <main id="main" className="flex-1">
          {children}
        </main>
      </PageTransition>
      <Footer
        brand={identity.name}
        phone={identity.phone}
        email={identity.email}
        address={identity.address}
        orgCount={site.compliance.orgCount}
        planCount={site.compliance.planCount}
        npn={site.compliance.npn}
        stateLicenses={site.compliance.stateLicenses}
        extraDisclosure={site.compliance.footerDisclosure}
      />
    </>
  );
}
