import { expect, test } from "@playwright/test";
import { textSizes } from "./support/browser";

const AUDITED_ROUTES = [
  "/",
  "/services",
  "/learn",
  "/contact",
  "/scope-of-appointment",
  "/do-not-contact",
  "/disclosures",
  "/accessibility",
  "/privacy",
];

test.describe("the 16px floor", () => {
  for (const path of AUDITED_ROUTES) {
    test(`item 20: no text on ${path} computes below 16px`, async ({
      page,
    }) => {
      await page.goto(path);

      const undersized = (await textSizes(page, "[data-compliance]")).filter(
        (entry) => entry.size < 16,
      );

      expect(
        undersized,
        `below the 16px floor on ${path}: ${JSON.stringify(undersized, null, 1)}`,
      ).toEqual([]);
    });
  }

  test("item 20: the excluded disclosures are above the floor too", async ({
    page,
  }) => {
    await page.goto("/");
    const undersized = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-compliance]")]
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => (el.textContent ?? "").trim().slice(0, 40)),
    );
    expect(undersized).toEqual([]);
  });
});
