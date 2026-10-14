import { expect, test } from "@playwright/test";
import { bandsWithoutVisibleText, sweepAndSettle } from "./support/parity";
import { PAGES } from "./support/routes";

const FALLBACKS = [
  { label: "reduced motion", options: { reducedMotion: "reduce" as const } },
  { label: "JavaScript off", options: { javaScriptEnabled: false } },
];

for (const { label, options } of FALLBACKS) {
  test.describe(label, () => {
    for (const path of PAGES) {
      test(`${path} shows text, no canvas, no video`, async ({ browser }) => {
        const context = await browser.newContext(options);
        const page = await context.newPage();
        await page.goto(path);
        await sweepAndSettle(page);

        expect(await bandsWithoutVisibleText(page)).toEqual([]);
        expect(await page.locator("canvas").count()).toBe(0);
        expect(await page.locator("video").count()).toBe(0);

        await context.close();
      });
    }
  });
}
