import { expect, test } from "@playwright/test";

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
}

test("the header lockup wraps without overflow or shrinking the mark at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");

  const text = page.locator("header [data-brand-lockup] > span");
  const mark = page.locator("header [data-brand-mark]");

  const before = await mark.boundingBox();

  for (const name of [
    "Northern Lights Medicare Benefits Advisors LLC",
    "x".repeat(40),
  ]) {
    await text.evaluate((el, value) => {
      el.textContent = value;
    }, name);

    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(scrollW, name).toBeLessThanOrEqual(clientW);

    const box = await mark.boundingBox();
    expect(box?.width, name).toBe(before?.width);
    expect(box?.height, name).toBe(before?.height);
  }
});
