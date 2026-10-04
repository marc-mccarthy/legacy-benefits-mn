import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Container, Prose, Section } from "@/components/ui/section";
import { site } from "@/content/site";
import { getBusinessIdentity } from "@/lib/business";

export const metadata = { title: "Page not found" };

export default async function NotFound() {
  const identity = await getBusinessIdentity();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header
        brand={identity.name}
        nav={site.nav}
        clientPortal={site.clientPortal}
        phone={identity.phone}
      />
      <main id="main" className="flex-1">
        <Section>
          <Container>
            <Prose className="space-y-6">
              <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
                We could not find that page
              </h1>
              <p className="lead text-muted text-lg">
                The link may be out of date, or the address may have a typo in
                it. Everything on the site is reachable from the menu above.
              </p>
              <ul className="flex flex-wrap gap-3">
                <li>
                  <Button asChild>
                    <Link href="/">Go to the home page</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild variant="secondary">
                    <Link href="/contact">Talk to a licensed agent</Link>
                  </Button>
                </li>
              </ul>
              {identity.phone ? (
                <p className="text-lg">
                  Prefer to call?{" "}
                  <a
                    className="tabular font-semibold underline underline-offset-4"
                    href={`tel:${identity.phone.replace(/\D/g, "")}`}
                  >
                    {identity.phone}
                  </a>{" "}
                  <span className="text-muted">(TTY&nbsp;711)</span>
                </p>
              ) : null}
            </Prose>
          </Container>
        </Section>
      </main>
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
