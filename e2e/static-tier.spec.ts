import { expect, test } from "@playwright/test";

const ROUTES = ["/privacy", "/disclosures", "/accessibility"];

for (const route of ROUTES) {
  test.describe(route, () => {
    test("has no canvas and keeps the pause control", async ({ page }) => {
      await page.goto(route);

      expect(await page.locator("canvas").count()).toBe(0);
      await expect(page.locator("[data-effects-pause]").first()).toBeAttached();
    });

    test("runs no animation", async ({ page }) => {
      await page.goto(route);

      for (const wait of [0, 1500]) {
        await page.waitForTimeout(wait);
        const running = await page.evaluate(
          () => document.getAnimations().length,
        );
        expect(running).toBe(0);
      }
    });
  });
}

test("accessibility page explains animations using the pause label", async ({
  page,
}) => {
  await page.goto("/accessibility");

  await expect(page.getByRole("heading", { name: "Animations" })).toBeVisible();
  const label = await page
    .locator("[data-effects-pause]")
    .first()
    .evaluate(
      (element) =>
        element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
    );
  const paragraph = page.getByText("Every page works without animation.");
  await expect(paragraph).toContainText(label);
  await expect(paragraph).toContainText(
    "turn on Reduce motion in your device settings, and the site shows still images instead.",
  );
});
