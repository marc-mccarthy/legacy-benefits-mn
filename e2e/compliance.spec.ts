import { expect, test } from "@playwright/test";

/**
 * These assertions encode regulatory requirements, not preferences. If one
 * fails, the site is not fit to publish — treat it as a release blocker.
 */

const PAGES = ["/", "/services", "/learn", "/events", "/contact"];

test.describe("CMS-required disclosures", () => {
  for (const path of PAGES) {
    test(`TPMO and government disclaimers appear on ${path}`, async ({
      page,
    }) => {
      await page.goto(path);

      // Some pages repeat the TPMO disclaimer next to the content as well as
      // in the global footer, so assert at least one visible instance.
      await expect(
        page
          .getByText("We do not offer every plan available in your area")
          .first(),
      ).toBeVisible();
      await expect(page.getByText("1-800-MEDICARE").first()).toBeVisible();
      await expect(
        page.getByText("not associated, endorsed, or authorized").first(),
      ).toBeVisible();
    });
  }

  test("footer links to disclosures, privacy, and opt-out", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(
      footer.getByRole("link", { name: "Disclosures" }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /Do Not Contact/ }),
    ).toBeVisible();
  });

  test("TTY number is published", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("TTY 711").first()).toBeVisible();
  });
});

test.describe("Scope of Appointment", () => {
  test("lists product types individually and requires a signature", async ({
    page,
  }) => {
    await page.goto("/scope-of-appointment");

    // CMS requires the beneficiary to choose specific product types, so a
    // single blanket "Medicare" option would not be compliant.
    await expect(
      page.getByRole("checkbox", { name: /Medicare Advantage \(Part C\)/ }),
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Part D/ })).toBeVisible();

    await page.getByRole("button", { name: /Sign and submit/ }).click();
    await expect(
      page.getByText("Select at least one product type"),
    ).toBeVisible();
  });

  test("states that signing does not enrol the beneficiary", async ({
    page,
  }) => {
    await page.goto("/scope-of-appointment");
    await expect(
      page.getByText("does not automatically enroll me in any plan"),
    ).toBeVisible();
  });
});

test.describe("opt-out", () => {
  test("do-not-contact form is reachable and needs no identity proof", async ({
    page,
  }) => {
    await page.goto("/do-not-contact");
    await expect(
      page.getByRole("heading", { name: /Stop contact/ }),
    ).toBeVisible();
    // No Turnstile, no login: a stop request must not be gated.
    await expect(
      page.getByRole("button", { name: /Submit request/ }),
    ).toBeVisible();
  });
});
