import { expect, test } from "@playwright/test";

/**
 * These assertions encode regulatory requirements, not preferences. If one
 * fails, the site is not fit to publish — treat it as a release blocker.
 */

const PAGES = ["/", "/services", "/learn", "/events", "/contact"];

test.describe("Medicare-required disclosures", () => {
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

    test(`no disclosure is set below 16px on ${path}`, async ({ page }) => {
      await page.goto(path);

      // Medicare sets the floor at 12 point, which is the 16px asserted below.
      // A floor, not a style preference: `text-sm` (14px ≈ 10.5pt) shipped on
      // four pages because the rule lived in a comment rather than in a test.
      const undersized = await page.evaluate(() =>
        [...document.querySelectorAll("[data-compliance]")]
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => ({
            size: getComputedStyle(el).fontSize,
            text: (el.textContent ?? "").trim().slice(0, 60),
          })),
      );

      expect(
        undersized,
        `disclosures below the 12pt floor: ${JSON.stringify(undersized)}`,
      ).toEqual([]);
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

    // Medicare requires the beneficiary to pick specific product types, so a
    // single blanket "Medicare" checkbox would not be compliant.
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

test.describe("cookie consent", () => {
  test("both buttons record a choice and dismiss the banner", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.getByRole("dialog", { name: "Cookie choices" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Reject" }).click();

    await expect(banner).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("consent-choice-v1")),
      )
      .toBe("denied");
  });

  test("is never server-rendered, so its buttons are always live", async ({
    page,
  }) => {
    // The banner's visibility depends on localStorage and Global Privacy
    // Control, neither of which the server can see. Emitting it server-side
    // meant every visitor who had already chosen — and everyone sending GPC —
    // got markup React then dropped from the client tree but left behind in the
    // DOM: a banner at full opacity with no event handlers, where neither
    // button did anything. Nothing about it looked broken.
    //
    // Asserting on the raw HTML rather than on the rendered page, because the
    // symptom only exists before hydration.
    const html = await (await page.request.get("/")).text();
    expect(html).not.toContain("Cookie choices");
  });

  test("a stored choice keeps the banner away on the next visit", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("dialog", { name: "Cookie choices" })
      .getByRole("button", { name: "Accept" })
      .click();

    await page.reload();

    // Hidden is not enough: the orphaned-node bug left a *visible* banner that
    // simply had no handlers, so assert it is absent from the DOM entirely.
    await expect(
      page.getByRole("dialog", { name: "Cookie choices" }),
    ).toHaveCount(0);
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
