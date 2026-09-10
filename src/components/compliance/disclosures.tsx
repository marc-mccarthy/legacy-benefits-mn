import {
  ENROLLMENT_DISCLAIMER,
  GOVERNMENT_DISCLAIMER,
  NONDISCRIMINATION_NOTICE,
  TTY_NOTICE,
  tpmoDisclaimer,
} from "@/lib/compliance/disclosures";
import { Prose } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/**
 * Size floor for every disclosure below.
 *
 * CMS requires disclosures at 12 POINT, which is ~16px. 14px is ~10.5pt and
 * 12px is ~9pt, so `text-sm` does not satisfy it either. This is appended AFTER
 * the caller's className on purpose: tailwind-merge keeps the last conflicting
 * class, so a page that passes `text-sm` to fit a layout gets overridden rather
 * than silently shipping an undersized legal notice. Four pages were doing
 * exactly that.
 *
 * `data-compliance` marks these for the E2E check that asserts none of them
 * renders below 16px on any page.
 */
const DISCLOSURE_FLOOR = "text-base";

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
  return (
    <p data-compliance className={cn(className, DISCLOSURE_FLOOR)}>
      {tpmoDisclaimer(orgCount, planCount)}
    </p>
  );
}

export function GovernmentDisclaimer({ className }: { className?: string }) {
  return (
    <p data-compliance className={cn(className, DISCLOSURE_FLOOR)}>
      {GOVERNMENT_DISCLAIMER}
    </p>
  );
}

export function EnrollmentDisclaimer({ className }: { className?: string }) {
  return (
    <p data-compliance className={cn(className, DISCLOSURE_FLOOR)}>
      {ENROLLMENT_DISCLAIMER}
    </p>
  );
}

/** Section 1557 nondiscrimination + language access + TTY. */
export function LanguageAccessNotice({ className }: { className?: string }) {
  return (
    <p data-compliance className={cn(className, DISCLOSURE_FLOOR)}>
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
    // 16px floor, deliberately. CMS requires disclosures at 12 POINT, which is
    // roughly 16px — 12px CSS is about 9pt and does not satisfy it. This block
    // is legally load-bearing; do not shrink it to fit a layout.
    //
    // Prose caps the measure at 65ch. Sitting directly in the footer container
    // these ran to 136 characters a line at 1440px — nearly double the readable
    // range, on the one block of text that is required to be readable. A size
    // floor alone does not make a paragraph legible if the eye cannot find the
    // start of the next line.
    <Prose className="text-muted space-y-3 text-base leading-relaxed">
      <TpmoDisclaimer orgCount={orgCount} planCount={planCount} />
      <GovernmentDisclaimer />
      <EnrollmentDisclaimer />
      <LanguageAccessNotice />
      {extra ? <p>{extra}</p> : null}
    </Prose>
  );
}
