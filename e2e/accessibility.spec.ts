import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PAGES = [
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

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  for (const path of PAGES) {
    test(`${path} has no detectable accessibility violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await settleReveals(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .exclude("[data-lit-word]")
        .analyze();

      expect(
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        })),
      ).toEqual([]);
    });
  }
});

test("every page has exactly one h1", async ({ page }) => {
  for (const path of ["/", "/contact", "/disclosures", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});

async function settleReveals(page: Page) {
  await page.addStyleTag({
    content:
      "[data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}",
  });

  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-reveal]")].every(
        (el) => Number(getComputedStyle(el).opacity) === 1,
      ),
    undefined,
    { timeout: 5000 },
  );
}
