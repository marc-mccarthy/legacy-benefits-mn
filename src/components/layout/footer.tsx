import Link from "next/link";
import { Container } from "@/components/ui/section";
import { FooterComplianceBlock } from "@/components/compliance/disclosures";

type FooterProps = {
  brand: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  orgCount?: number | null;
  planCount?: number | null;
  npn?: string | null;
  stateLicenses?: { state: string; licenseNumber?: string | null }[];
  extraDisclosure?: string | null;
};

const legalLinks = [
  { href: "/disclosures", label: "Disclosures" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/do-not-contact", label: "Do Not Contact / Do Not Sell My Info" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/scope-of-appointment", label: "Scope of Appointment" },
];

export function Footer({
  brand,
  phone,
  email,
  address,
  orgCount,
  planCount,
  npn,
  stateLicenses,
  extraDisclosure,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      data-scheme="dark"
      className="bg-surface text-on-surface border-border-subtle mt-auto border-t"
    >
      <Container className="space-y-4 py-(--spacing-medium)">
        {phone ? (
          <p className="flex items-center gap-2">
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="inline-flex min-h-11 items-center hover:underline"
            >
              {phone}
            </a>
            <span className="text-muted">· TTY 711</span>
          </p>
        ) : null}
        <FooterComplianceBlock
          orgCount={orgCount ?? undefined}
          planCount={planCount ?? undefined}
          extra={extraDisclosure}
        />
      </Container>

      <Container className="grid gap-10 py-(--spacing-large) md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-bold">{brand}</p>
          {address ? (
            <p className="text-muted whitespace-pre-line">
              {address.replace(/\\r\\n|\\n/g, "\n")}
            </p>
          ) : null}
          {email ? (
            <p>
              <a
                href={`mailto:${email}`}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {email}
              </a>
            </p>
          ) : null}
        </div>

        <nav aria-label="Legal">
          <ul className="space-y-1">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-muted space-y-2">
          {npn ? <p>National Producer Number: {npn}</p> : null}
          {stateLicenses?.length ? (
            <p>
              Licensed in:{" "}
              {stateLicenses
                .map((l) => l.state)
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </div>
      </Container>

      <div className="border-border-subtle border-t">
        <Container className="py-(--spacing-medium)">
          <p className="text-muted">
            © {year} {brand}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
