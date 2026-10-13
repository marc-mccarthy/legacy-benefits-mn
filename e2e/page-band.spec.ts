import { expect, test, type Page } from "@playwright/test";
import { brightestBackground, contrast, HIDE_CHROME } from "./support/contrast";
import { articles } from "../src/content/articles";
import { services } from "../src/content/services";

const BAND = "[data-page-band]";
const VIDEO = `${BAND} video`;
const EFFECTS_PAUSE = "[data-effects-pause]";
const PHONE = { width: 390, height: 844 };

const ROUTES = [
  "/services",
  `/services/${services[0].slug}`,
  "/learn",
  `/learn/${articles[0].slug}`,
];

const seekTo = (page: Page, fraction: number) =>
  page.locator(VIDEO).evaluate(async (el, f) => {
    const v = el as HTMLVideoElement;
    v.pause();
    if (Number.isNaN(v.duration)) {
      v.load();
      await new Promise((r) =>
        v.addEventListener("loadedmetadata", r, { once: true }),
      );
    }
    const seeked = new Promise((r) =>
      v.addEventListener("seeked", r, { once: true }),
    );
    v.currentTime = Math.min(f * v.duration, v.duration - 0.05);
    await seeked;
  }, fraction);

test.describe("inform header bands", () => {
  for (const route of ROUTES) {
    test(`${route}: one h1 in the band, above the fold, no canvas`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(route);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(`${BAND} h1`)).toHaveCount(1);
      const box = await page.locator("h1").boundingBox();
      expect(box!.y + box!.height).toBeLessThan(PHONE.height * 0.8);

      await page.waitForTimeout(3000);
      await page.evaluate(() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        }),
      );
      await page.waitForTimeout(500);
      await expect(page.locator("canvas")).toHaveCount(0);
    });

    test(`${route}: the loop is muted, inline, preload none, posters the still`, async ({
      page,
    }) => {
      await page.goto(route);

      const video = page.locator(VIDEO);
      await expect(video).toHaveCount(1);
      await expect(page.locator("video")).toHaveCount(1);
      expect(await video.evaluate((el) => (el as HTMLVideoElement).muted)).toBe(
        true,
      );
      await expect(video).toHaveAttribute("playsinline", "");
      await expect(video).toHaveAttribute("loop", "");
      await expect(video).toHaveAttribute("preload", "none");
      await expect(video).toHaveAttribute("poster", /lake-dusk/);
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                [...document.querySelectorAll("video")].filter((v) => !v.paused)
                  .length,
            ),
          { timeout: 15_000 },
        )
        .toBeLessThanOrEqual(1);
    });

    test(`${route}: white title keeps AA over every sampled frame`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(route);
      await expect(page.locator(VIDEO)).toHaveCount(1);
      await page.addStyleTag({
        content: `${HIDE_CHROME} ${BAND} h1 { visibility: hidden !important; }`,
      });

      let worst = 0;
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await seekTo(page, fraction);
        await page.waitForTimeout(150);
        worst = Math.max(worst, await brightestBackground(page, `${BAND} h1`));
      }

      expect(contrast("#FFFFFF", worst)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("reduced motion shows only the still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator(`${BAND} h1`)).toBeVisible();
      await expect(page.locator("video")).toHaveCount(0);
    }
  });

  test("pressing Pause pauses the loop and the still shows", async ({
    page,
  }) => {
    await page.goto("/services");
    const video = page.locator(VIDEO);
    await expect
      .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused), {
        timeout: 15_000,
      })
      .toBe(false);

    await page.locator(EFFECTS_PAUSE).first().click();

    await expect
      .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused))
      .toBe(true);
    await expect(video).toBeHidden();
    await expect(page.locator(`${BAND} img`)).toBeVisible();
  });
});
