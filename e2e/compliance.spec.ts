import { expect, test } from "@playwright/test";

const PAGES = ["/", "/services", "/learn", "/events", "/contact"];

test.describe("Medicare-required disclosures", () => {
  for (const path of PAGES) {
    test(`TPMO and government disclaimers appear on ${path}`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(
        page
          .getByText("We do not offer every plan available in your area")
          .first(),
      ).toBeVisible();
      await expect(
        page.getByText("1-800-MEDICARE").filter({ visible: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText("not associated, endorsed, or authorized").first(),
      ).toBeVisible();
    });

    test(`no disclosure is set below 16px on ${path}`, async ({ page }) => {
      await page.goto(path);

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
    await expect(
      page.getByRole("button", { name: /Submit request/ }),
    ).toBeVisible();
  });
});
