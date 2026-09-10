import { expect, test } from "@playwright/test";

/**
 * WCAG 1.4.10 (Reflow): content must not require horizontal scrolling at 400%
 * zoom. Browser zoom presents to CSS as a proportionally narrower viewport, so
 * 200% and 400% on a 1440px window are emulated as 720px and 360px.
 *
 * This audience zooms — it is the primary way presbyopia is compensated for on
 * a laptop. The specific regression it guards is a fluid `clamp()` written with
 * only `vw` terms: those ignore zoom entirely, so type stays put while the
 * layout around it shrinks, and something eventually overflows.
 */

const PAGES = [
  "/",
  "/services",
  "/learn",
  "/events",
  "/contact",
  "/disclosures",
];

const ZOOMS = [
  { label: "200%", width: 720, height: 450 },
  { label: "400%", width: 360, height: 225 },
];

for (const { label, width, height } of ZOOMS) {
  for (const path of PAGES) {
    test(`${path} has no horizontal scroll at ${label} zoom`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);

      const overflow = await page.evaluate(() => {
        const d = document.documentElement;
        // Name the widest offenders, so a failure points at the element rather
        // than just reporting that the page is too wide.
        const offenders = [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > d.clientWidth + 1)
          .slice(0, 3)
          .map((el) => `${el.tagName}.${el.className.toString().slice(0, 40)}`);
        return { scrollW: d.scrollWidth, clientW: d.clientWidth, offenders };
      });

      // 1px of tolerance for sub-pixel rounding at fractional widths.
      expect(
        overflow.scrollW,
        `overflowing: ${overflow.offenders.join(" | ")}`,
      ).toBeLessThanOrEqual(overflow.clientW + 1);
    });
  }
}
