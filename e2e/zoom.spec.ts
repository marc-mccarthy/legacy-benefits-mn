import { expect, test } from "@playwright/test";
import { PAGES } from "./support/routes";

const ZOOMS = [
  { label: "phone", width: 390, height: 844 },
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
    expect(box?.width, name).toBeGreaterThanOrEqual(20);
    expect(box?.height, name).toBeGreaterThanOrEqual(20);
  }
});

for (const width of [360, 390]) {
  test(`the stuck header keeps the full lockup visible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator("header[data-site-header]")).toHaveAttribute(
      "data-stuck",
      "",
    );

    const box = await page
      .locator("header [data-brand-lockup] > span")
      .boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(12);

    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(clientW);
  });
}

test("long footer address and email wrap instead of widening the page at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.evaluate(() => {
    const set = (selector: string, value: string) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`missing ${selector}`);
      el.textContent = value;
    };
    set("[data-footer-address]", "x".repeat(60));
    set("[data-footer-email]", `${"y".repeat(50)}@${"z".repeat(9)}`);
  });

  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
});
