import { expect, test } from "@playwright/test";
import { upcomingEvents } from "../src/content/events";
import { homeBlocks } from "../src/content/home";
import { bandsWithoutVisibleText, sweepAndSettle } from "./support/parity";
import { ROUTES } from "./support/routes";

const FALLBACKS = [
  { label: "reduced motion", options: { reducedMotion: "reduce" as const } },
  { label: "JavaScript off", options: { javaScriptEnabled: false } },
];

for (const { label, options } of FALLBACKS) {
  test.describe(label, () => {
    for (const { path } of ROUTES) {
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

test.describe("print", () => {
  for (const { path } of ROUTES) {
    test(`${path} shows text and hides every canvas`, async ({ page }) => {
      await page.goto(path);
      await page.emulateMedia({ media: "print" });

      expect(await bandsWithoutVisibleText(page)).toEqual([]);
      const shown = await page.evaluate(
        () =>
          [...document.querySelectorAll("canvas")].filter(
            (canvas) => getComputedStyle(canvas).display !== "none",
          ).length,
      );
      expect(shown).toBe(0);
    });
  }
});

test.describe("canvas count with motion", () => {
  for (const { path, tier } of ROUTES) {
    if (tier === "home") continue;
    test(`${path} (${tier}) has zero canvas`, async ({ browser }) => {
      const context = await browser.newContext({
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      await page.goto(path);
      await sweepAndSettle(page);

      expect(await page.locator("canvas").count()).toBe(0);

      await context.close();
    });
  }

  test("/ mounts at most one canvas and the counter can see it", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect
      .poll(() => page.locator("canvas").count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(1);
    await sweepAndSettle(page);
    expect(await page.locator("canvas").count()).toBeLessThanOrEqual(1);

    await context.close();
  });

  test("/ canvas is display none in print", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.locator("canvas").count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(1);
    await page.emulateMedia({ media: "print" });

    const shown = await page.evaluate(
      () =>
        [...document.querySelectorAll("canvas")].filter(
          (canvas) => getComputedStyle(canvas).display !== "none",
        ).length,
    );
    expect(shown).toBe(0);
  });
});

test("/ renders one band per home block", async ({ page }) => {
  await page.goto("/");

  const expected =
    homeBlocks.length - (upcomingEvents(new Date()).length === 0 ? 1 : 0);
  expect(await page.locator("[data-band]").count()).toBe(expected);
});
