import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/services",
  "/learn",
  "/events",
  "/contact",
  "/scope-of-appointment",
  "/do-not-contact",
  "/disclosures",
  "/accessibility",
  "/privacy",
];

const MOTION_PREFERENCES = ["reduce", "no-preference"] as const;

for (const preference of MOTION_PREFERENCES) {
  test.describe(`prefers-reduced-motion: ${preference}`, () => {
    test.use({ contextOptions: { reducedMotion: preference } });

    for (const path of PAGES) {
      test(`${path} has no detectable accessibility violations`, async ({
        page,
      }) => {
        await page.goto(path);
        await settleReveals(page);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          // The lit copy is an aria-hidden duplicate painted over a
          // full-opacity base word; axe scores it alone and cannot see the
          // composite the eye gets.
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
}

test("every page has exactly one h1", async ({ page }) => {
  for (const path of ["/", "/contact", "/disclosures", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});

// Reveal drives opacity from 0 to 1, and axe scores the blended mid-fade
// colour rather than the resting one. Pinning the end state makes that
// deterministic; the scroll pass still runs so viewport-triggered content and
// the consent dialog are present when axe looks.
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
