import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated WCAG 2.2 AA checks. These catch roughly a third of real issues —
 * they are a floor, not a substitute for testing with an actual screen reader
 * before launch.
 */

// Reveal animations interpolate opacity, and axe computes contrast against
// the *current* blended colour. Running with reduced motion settles the
// animation so contrast is measured on the real colours, not mid-fade values.
test.use({ contextOptions: { reducedMotion: "reduce" } });

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

for (const path of PAGES) {
  test(`${path} has no detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
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

test("every page has exactly one h1", async ({ page }) => {
  for (const path of ["/", "/contact", "/disclosures", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});
