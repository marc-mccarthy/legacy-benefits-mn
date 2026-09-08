/**
 * Regulated disclosure text.
 *
 * Every string here is versioned. When a disclosure changes, add a new version
 * rather than editing in place: consent and Scope of Appointment records store
 * the version that was actually shown to the visitor, and CMS expects those
 * records to be reproducible for 10 years. Editing text in place would silently
 * rewrite the evidence for every past submission.
 *
 * Nothing in this file should be reworded without compliance review.
 */

export const DISCLOSURE_VERSION = "2026-09-01.1";

/**
 * CMS Third-Party Marketing Organization disclaimer. Required on Medicare
 * marketing sites. The organization and plan counts must be accurate for the
 * agent's actual appointments, so they come from site settings rather than
 * being hardcoded — an inaccurate count is itself a violation.
 */
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

/** Required on Medicare marketing materials. */
export const GOVERNMENT_DISCLAIMER =
  "This is a proprietary website and is not associated, endorsed, or authorized by the Social Security Administration, the U.S. Department of Health and Human Services, or the Centers for Medicare & Medicaid Services. This site contains decision-support content and descriptions of government programs and is not a government website.";

/** Shown wherever plan options are described. */
export const ENROLLMENT_DISCLAIMER =
  "Enrollment in a plan depends on the plan's contract renewal with Medicare. Plan availability, benefits, premiums, and cost sharing vary by plan and by county.";

/**
 * TCPA express written consent. Must name the specific business that will be
 * contacting the consumer, list the channels, state that consent is not a
 * condition of purchase, and explain how to opt out. Stored verbatim with the
 * lead alongside the timestamp — a boolean "consent: true" is not evidence.
 */
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

/**
 * Scope of Appointment. CMS requires a documented, plan-type-specific SOA
 * before a Medicare Advantage or Part D sales meeting, and requires the
 * request to be at least 48 hours ahead of the appointment where practicable.
 */
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

/** Section 1557 / CMS language access. */
export const NONDISCRIMINATION_NOTICE =
  "We comply with applicable federal civil rights laws and do not discriminate on the basis of race, color, national origin, age, disability, or sex. Language assistance services and auxiliary aids are available free of charge.";

export const TTY_NOTICE = "TTY users may dial 711.";

/** CMS requires marketing records to be retained for 10 years. */
export const RECORD_RETENTION_YEARS = 10;
