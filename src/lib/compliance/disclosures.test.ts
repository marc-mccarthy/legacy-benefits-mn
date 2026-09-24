import { describe, expect, it } from "vitest";
import {
  DISCLOSURE_VERSION,
  ENROLLMENT_DISCLAIMER,
  GOVERNMENT_DISCLAIMER,
  NONDISCRIMINATION_NOTICE,
  RECORD_RETENTION_YEARS,
  SOA_ATTESTATION,
  SOA_PRODUCT_TYPES,
  TTY_NOTICE,
  tcpaConsentText,
  tpmoDisclaimer,
} from "./disclosures";

describe("tpmoDisclaimer", () => {
  it("states the four things Medicare requires of a TPMO", () => {
    const text = tpmoDisclaimer();

    expect(text).toContain(
      "We do not offer every plan available in your area.",
    );
    expect(text).toContain(
      "Any information we provide is limited to those plans we do offer in your area.",
    );
    expect(text).toContain("1-800-MEDICARE");
    expect(text).toContain("State Health Insurance Assistance Program (SHIP)");
  });

  it("includes the represented-plan counts when both are known", () => {
    expect(tpmoDisclaimer(4, 27)).toContain(
      "Currently we represent 4 organization(s) which offer 27 product(s) in your area.",
    );
  });

  it("omits the count sentence when neither is configured", () => {
    // An absent count is silence; a wrong count is itself a Medicare marketing
    // violation, so the sentence only appears when the agent has supplied real
    // numbers.
    expect(tpmoDisclaimer()).not.toContain("Currently we represent");
  });

  it.each([
    ["only an organisation count", 4, undefined],
    ["only a plan count", undefined, 27],
  ])("omits the sentence with %s", (_label, orgs, plans) => {
    expect(tpmoDisclaimer(orgs, plans)).not.toContain("Currently we represent");
  });

  it.each([
    ["zero organisations", 0, 27],
    ["zero plans", 4, 0],
  ])("omits the sentence for %s", (_label, orgs, plans) => {
    // "we represent 0 organization(s)" would be both absurd and inaccurate.
    expect(tpmoDisclaimer(orgs, plans)).not.toContain("Currently we represent");
  });

  it("leaves no double spacing where the optional sentence was dropped", () => {
    // The parts are filtered before joining; a stray blank would read as a
    // formatting error in regulated copy.
    expect(tpmoDisclaimer()).not.toMatch(/ {2}/);
    expect(tpmoDisclaimer(4, 27)).not.toMatch(/ {2}/);
  });
});

describe("tcpaConsentText", () => {
  it("names the business obtaining consent", () => {
    // Consent must name the specific caller; "a licensed agent" would not be
    // express written consent for anyone in particular.
    expect(tcpaConsentText("Acme Medicare")).toContain(
      "prior express written consent for Acme Medicare",
    );
  });

  it("lists the channels and technologies consented to", () => {
    const text = tcpaConsentText("Acme Medicare");

    expect(text).toContain("automatic telephone dialing system");
    expect(text).toContain("prerecorded or artificial voice");
    expect(text).toContain("SMS text message");
  });

  it("states that consent is not a condition of purchase", () => {
    expect(tcpaConsentText("Acme Medicare")).toContain(
      "consent is not a condition of purchase",
    );
  });

  it("explains how to revoke", () => {
    const text = tcpaConsentText("Acme Medicare");

    expect(text).toContain("revoke this consent at any time");
    expect(text).toContain("STOP");
    expect(text).toContain("do-not-contact form");
  });

  it("includes the phone number in parentheses when given", () => {
    expect(tcpaConsentText("Acme Medicare", "612-555-0100")).toContain(
      "Acme Medicare (612-555-0100) to contact me",
    );
  });

  it("reads correctly with no phone number", () => {
    // No empty "()" left behind by the dropped segment.
    const text = tcpaConsentText("Acme Medicare");

    expect(text).not.toContain("()");
    expect(text).toContain("Acme Medicare to contact me");
  });
});

describe("SOA_PRODUCT_TYPES", () => {
  it("covers the product types an SOA must be specific about", () => {
    expect(SOA_PRODUCT_TYPES.map((p) => p.value)).toEqual([
      "ma-mapd",
      "pdp",
      "supplement",
      "dsnp",
      "hospital-indemnity",
      "dental-vision-hearing",
    ]);
  });

  it("has a unique value per entry", () => {
    // Duplicates would make the stored SOA ambiguous about what was agreed.
    const values = SOA_PRODUCT_TYPES.map((p) => p.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("gives every value a human-readable label", () => {
    for (const { value, label } of SOA_PRODUCT_TYPES) {
      expect(label, `label for ${value}`).toBeTruthy();
      expect(label.length).toBeGreaterThan(value.length);
    }
  });

  it("spells out the Part C and Part D options a beneficiary must recognise", () => {
    const labels = SOA_PRODUCT_TYPES.map((p) => p.label).join(" ");

    expect(labels).toContain("Medicare Advantage");
    expect(labels).toContain("Part D");
    expect(labels).toContain("Medigap");
  });
});

describe("retention", () => {
  it("is the ten years Medicare requires of marketing records", () => {
    expect(RECORD_RETENTION_YEARS).toBe(10);
  });
});

describe("the version travels with the text", () => {
  // These assertions exist to make editing a disclosure in place impossible
  // without noticing.
  //
  // Leads and SOA records store the version that was shown, and Medicare
  // expects those records reproducible for ten years. Rewording a constant
  // without adding a new version silently rewrites the evidence for every
  // submission already on file. Changing any text below fails these tests, at
  // which point the correct move is a NEW version — not an updated snapshot.

  it("is the version currently in force", () => {
    expect(DISCLOSURE_VERSION).toBe("2026-09-01.1");
  });

  it("uses a sortable dated version format", () => {
    expect(DISCLOSURE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it("pins the government non-affiliation disclaimer", () => {
    expect(GOVERNMENT_DISCLAIMER).toBe(
      "This is a proprietary website and is not associated, endorsed, or authorized by the Social Security Administration, the U.S. Department of Health and Human Services, or the Centers for Medicare & Medicaid Services. This site contains decision-support content and descriptions of government programs and is not a government website.",
    );
  });

  it("pins the enrollment disclaimer", () => {
    expect(ENROLLMENT_DISCLAIMER).toBe(
      "Enrollment in a plan depends on the plan's contract renewal with Medicare. Plan availability, benefits, premiums, and cost sharing vary by plan and by county.",
    );
  });

  it("pins the SOA attestation", () => {
    expect(SOA_ATTESTATION).toBe(
      "I understand that this Scope of Appointment records the product types I agreed to discuss. Signing it does not obligate me to enroll in a plan, does not affect my current enrollment, and does not automatically enroll me in any plan. A sales agent may be paid based on my enrollment in a plan.",
    );
  });

  it("pins the nondiscrimination notice and TTY line", () => {
    expect(NONDISCRIMINATION_NOTICE).toBe(
      "We comply with applicable federal civil rights laws and do not discriminate on the basis of race, color, national origin, age, disability, or sex. Language assistance services and auxiliary aids are available free of charge.",
    );
    expect(TTY_NOTICE).toBe("TTY users may dial 711.");
  });

  it("pins the full TCPA consent wording", () => {
    expect(tcpaConsentText("Acme Medicare", "612-555-0100")).toBe(
      "By checking this box and submitting this form, I give my prior express written consent for Acme Medicare (612-555-0100) to contact me at the phone number and email address I provided, including by automatic telephone dialing system, prerecorded or artificial voice, and SMS text message, regarding Medicare Advantage, Medicare Supplement, and prescription drug plan options. I understand consent is not a condition of purchase and that message and data rates may apply. I may revoke this consent at any time by replying STOP to a text message or by using the do-not-contact form on this site.",
    );
  });

  it("pins the full TPMO disclaimer", () => {
    expect(tpmoDisclaimer(4, 27)).toBe(
      "We do not offer every plan available in your area. Currently we represent 4 organization(s) which offer 27 product(s) in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Assistance Program (SHIP) to get information on all of your options.",
    );
  });
});
