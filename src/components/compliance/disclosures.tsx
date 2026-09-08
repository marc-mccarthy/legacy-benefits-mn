import {
  ENROLLMENT_DISCLAIMER,
  GOVERNMENT_DISCLAIMER,
  NONDISCRIMINATION_NOTICE,
  TTY_NOTICE,
  tpmoDisclaimer,
} from "@/lib/compliance/disclosures";

/**
 * CMS Third-Party Marketing Organization disclaimer.
 *
 * Must appear on Medicare marketing sites and must be readable — not hidden
 * behind a toggle or set in a smaller size than surrounding body copy.
 */
export function TpmoDisclaimer({
  orgCount,
  planCount,
  className,
}: {
  orgCount?: number;
  planCount?: number;
  className?: string;
}) {
  return <p className={className}>{tpmoDisclaimer(orgCount, planCount)}</p>;
}

export function GovernmentDisclaimer({ className }: { className?: string }) {
  return <p className={className}>{GOVERNMENT_DISCLAIMER}</p>;
}

export function EnrollmentDisclaimer({ className }: { className?: string }) {
  return <p className={className}>{ENROLLMENT_DISCLAIMER}</p>;
}

/** Section 1557 nondiscrimination + language access + TTY. */
export function LanguageAccessNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      {NONDISCRIMINATION_NOTICE} {TTY_NOTICE}
    </p>
  );
}

/**
 * The full block that must appear in the footer of every page. Grouped in one
 * component so a page cannot accidentally ship with only some of it.
 */
export function FooterComplianceBlock({
  orgCount,
  planCount,
  extra,
}: {
  orgCount?: number;
  planCount?: number;
  extra?: string | null;
}) {
  return (
    <div className="text-muted space-y-3 text-xs leading-relaxed">
      <TpmoDisclaimer orgCount={orgCount} planCount={planCount} />
      <GovernmentDisclaimer />
      <EnrollmentDisclaimer />
      <LanguageAccessNotice />
      {extra ? <p>{extra}</p> : null}
    </div>
  );
}
