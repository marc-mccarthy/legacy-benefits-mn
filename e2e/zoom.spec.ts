import { expect, test } from "@playwright/test";
import { PAGES } from "./support/routes";

for (const path of PAGES) {
  test(`${path} has no horizontal scroll at 400% zoom`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 225 });
    await page.goto(path);

    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      const offenders = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > d.clientWidth + 1)
        .slice(0, 3)
        .map((el) => `${el.tagName}.${el.className.toString().slice(0, 40)}`);
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, offenders };
    });

    expect(
      overflow.scrollW,
      `overflowing: ${overflow.offenders.join(" | ")}`,
    ).toBeLessThanOrEqual(overflow.clientW + 1);
  });
}
