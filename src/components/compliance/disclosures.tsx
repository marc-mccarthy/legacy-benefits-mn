import {
  CMIP_DESIGNATION_NOTICE,
  ENROLLMENT_DISCLAIMER,
  GOVERNMENT_DISCLAIMER,
  NONDISCRIMINATION_NOTICE,
  TTY_NOTICE,
  tpmoDisclaimer,
} from "@/lib/compliance/disclosures";
import { Prose } from "@/components/ui/section";
import { WithMarks } from "@/components/ui/person-name";
import { cn } from "@/lib/utils";

const DISCLOSURE_FLOOR = "text-base";

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

export function LanguageAccessNotice({ className }: { className?: string }) {
  return (
    <p data-compliance className={cn(className, DISCLOSURE_FLOOR)}>
      {NONDISCRIMINATION_NOTICE} {TTY_NOTICE}
    </p>
  );
}

export function CmipDesignationNotice({ className }: { className?: string }) {
  return (
    <p
      data-compliance
      data-cmip-notice
      className={cn(className, DISCLOSURE_FLOOR, "leading-snug italic")}
    >
      <WithMarks text={CMIP_DESIGNATION_NOTICE} />
    </p>
  );
}

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
    <Prose className="text-muted space-y-3 text-base leading-relaxed">
      <TpmoDisclaimer orgCount={orgCount} planCount={planCount} />
      <GovernmentDisclaimer />
      <EnrollmentDisclaimer />
      <LanguageAccessNotice />
      <CmipDesignationNotice />
      {extra ? <p>{extra}</p> : null}
    </Prose>
  );
}
