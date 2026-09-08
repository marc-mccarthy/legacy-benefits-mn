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
    <footer data-scheme="dark" className="bg-surface text-on-surface mt-auto">
      <Container className="grid gap-10 py-(--spacing-large) md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-bold">{brand}</p>
          {address ? (
            <p className="text-muted text-sm whitespace-pre-line">{address}</p>
          ) : null}
          {phone ? (
            <p className="text-sm">
              <a href={`tel:${phone.replace(/\D/g, "")}`}>{phone}</a>
              <span className="text-muted"> · TTY 711</span>
            </p>
          ) : null}
          {email ? (
            <p className="text-sm">
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
        </div>

        <nav aria-label="Legal">
          <ul className="space-y-2 text-sm">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-muted space-y-2 text-sm">
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
        <Container className="space-y-4 py-(--spacing-medium)">
          <FooterComplianceBlock
            orgCount={orgCount ?? undefined}
            planCount={planCount ?? undefined}
            extra={extraDisclosure}
          />
          <p className="text-muted text-xs">
            © {year} {brand}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
