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
            <p className="text-muted whitespace-pre-line">{address}</p>
          ) : null}
          {/* min-h-11 on every link in this footer, matching the floor argued
           * for in button.tsx. At 390px these measured 22px tall — half the
           * floor — and that included the phone number and, below, the
           * do-not-contact and Scope of Appointment links. Those are the ones
           * someone reaches for when they are already confused or annoyed, and
           * a missed tap at that moment is the worst time to have one. */}
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
          {/* space-y-1 rather than the previous space-y-2: the 44px rows now
           * supply most of the separation themselves, and a small gap is still
           * worth keeping so a slightly-off tap lands on nothing rather than on
           * the neighbouring link. */}
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
        <Container className="space-y-4 py-(--spacing-medium)">
          <FooterComplianceBlock
            orgCount={orgCount ?? undefined}
            planCount={planCount ?? undefined}
            extra={extraDisclosure}
          />
          <p className="text-muted text-sm">
            © {year} {brand}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
