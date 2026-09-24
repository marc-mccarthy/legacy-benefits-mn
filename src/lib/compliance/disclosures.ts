/**
 * Consent and SOA rows store `DISCLOSURE_VERSION`, not the text, so editing a
 * string in place changes what every past row resolves to. Bump the version and
 * add the new wording instead.
 */

export const DISCLOSURE_VERSION = "2026-09-01.1";

// Counts are passed in, from `site.compliance`, rather than written into the
// literal, so one agent's appointments do not end up baked into the string.
export function tpmoDisclaimer(orgCount?: number, planCount?: number): string {
  const scope =
    orgCount && planCount
      ? `Currently we represent ${orgCount} organization(s) which offer ${planCount} product(s) in your area.`
      : "";
  return [
    "We do not offer every plan available in your area.",
    scope,
    "Any information we provide is limited to those plans we do offer in your area.",
    "Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Assistance Program (SHIP) to get information on all of your options.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const GOVERNMENT_DISCLAIMER =
  "This is a proprietary website and is not associated, endorsed, or authorized by the Social Security Administration, the U.S. Department of Health and Human Services, or the Centers for Medicare & Medicaid Services. This site contains decision-support content and descriptions of government programs and is not a government website.";

export const ENROLLMENT_DISCLAIMER =
  "Enrollment in a plan depends on the plan's contract renewal with Medicare. Plan availability, benefits, premiums, and cost sharing vary by plan and by county.";

// Rendered with the caller named, and stored verbatim beside the lead.
export function tcpaConsentText(businessName: string, phone?: string): string {
  return [
    `By checking this box and submitting this form, I give my prior express written consent for ${businessName}`,
    phone ? `(${phone})` : "",
    "to contact me at the phone number and email address I provided, including by automatic telephone dialing system, prerecorded or artificial voice, and SMS text message, regarding Medicare Advantage, Medicare Supplement, and prescription drug plan options.",
    "I understand consent is not a condition of purchase and that message and data rates may apply.",
    "I may revoke this consent at any time by replying STOP to a text message or by using the do-not-contact form on this site.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const SOA_ATTESTATION =
  "I understand that this Scope of Appointment records the product types I agreed to discuss. Signing it does not obligate me to enroll in a plan, does not affect my current enrollment, and does not automatically enroll me in any plan. A sales agent may be paid based on my enrollment in a plan.";

export const SOA_PRODUCT_TYPES = [
  {
    value: "ma-mapd",
    label:
      "Medicare Advantage (Part C) and Medicare Advantage Prescription Drug plans",
  },
  {
    value: "pdp",
    label: "Standalone Medicare Prescription Drug plans (Part D)",
  },
  { value: "supplement", label: "Medicare Supplement (Medigap) products" },
  { value: "dsnp", label: "Dual-eligible Special Needs Plans (D-SNP)" },
  {
    value: "hospital-indemnity",
    label: "Hospital indemnity or other ancillary products",
  },
  {
    value: "dental-vision-hearing",
    label: "Dental, vision, and hearing products",
  },
] as const;

export type SoaProductType = (typeof SOA_PRODUCT_TYPES)[number]["value"];

export const NONDISCRIMINATION_NOTICE =
  "We comply with applicable federal civil rights laws and do not discriminate on the basis of race, color, national origin, age, disability, or sex. Language assistance services and auxiliary aids are available free of charge.";

export const TTY_NOTICE = "TTY users may dial 711.";

export const RECORD_RETENTION_YEARS = 10;
