import { expect, test } from "@playwright/test";
import { textSizes } from "./support/browser";

const AUDITED_ROUTES = [
  "/",
  "/services",
  "/learn",
  "/contact",
  "/scope-of-appointment",
  "/do-not-contact",
  "/disclosures",
  "/accessibility",
  "/privacy",
];

const WIDTHS = [
  { label: "1440px", width: 1440, height: 900 },
  { label: "720px (200% zoom)", width: 720, height: 450 },
  { label: "360px (400% zoom)", width: 360, height: 225 },
];

test.describe("the 16px floor", () => {
  for (const path of AUDITED_ROUTES) {
    test(`item 20: no text on ${path} computes below 16px`, async ({
      page,
    }) => {
      await page.goto(path);

      const undersized = (
        await textSizes(page, "[data-compliance], [data-legal-mark]")
      ).filter((entry) => entry.size < 16);

      expect(
        undersized,
        `below the 16px floor on ${path}: ${JSON.stringify(undersized, null, 1)}`,
      ).toEqual([]);
    });
  }

  test("item 20: the only text exempt as a legal mark is a lone ®, ℠ or ™", async ({
    page,
  }) => {
    for (const path of ["/", "/contact", "/team"]) {
      await page.goto(path);
      const marks = await page
        .locator("[data-legal-mark]")
        .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
      expect(marks.length, path).toBeGreaterThan(0);
      for (const mark of marks) expect(mark, path).toMatch(/^[®℠™]$/);
    }
  });

  test("item 20: the excluded disclosures are above the floor too", async ({
    page,
  }) => {
    await page.goto("/");
    const undersized = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-compliance]")]
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => (el.textContent ?? "").trim().slice(0, 40)),
    );
    expect(undersized).toEqual([]);
  });
});

test.describe("the 36px display floor", () => {
  const DISPLAY_ROUTES = [
    "/",
    "/services",
    "/learn",
    "/contact",
    "/disclosures",
  ];

  for (const { label, width, height } of WIDTHS) {
    for (const path of DISPLAY_ROUTES) {
      test(`item 21: the display face never drops below 36px on ${path} at ${label}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.goto(path);

        const offenders = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".font-display")]
            .filter((el) => el.getBoundingClientRect().height > 0)
            .map((el) => ({
              tag: el.tagName.toLowerCase(),
              size: parseFloat(getComputedStyle(el).fontSize),
              family: getComputedStyle(el).fontFamily.split(",")[0],
              text: (el.textContent ?? "").trim().slice(0, 40),
            }))
            .filter((entry) => entry.size < 36),
        );

        expect(
          offenders,
          `display headings below 36px on ${path} at ${label}: ${JSON.stringify(offenders)}`,
        ).toEqual([]);
      });
    }
  }

  test("item 21: the display face is the extended grotesque, so the floor is measuring the right thing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const families = await page.evaluate(() => ({
      display: getComputedStyle(document.querySelector(".font-display")!)
        .fontFamily,
      body: getComputedStyle(document.body).fontFamily,
    }));

    expect(
      families.display,
      "the display class is not resolving to a named family",
    ).toMatch(/Archivo/i);
    expect(
      families.body,
      "the body face is a bare fallback stack, not a named family",
    ).toMatch(/[A-Za-z]/);
    expect(families.body).not.toBe(families.display);
  });
});

test.describe("the 44px target floor", () => {
  const measure = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const SELECTOR = [
        "a[href]",
        "button",
        'input:not([type="hidden"])',
        "select",
        "textarea",
        '[role="button"]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(",");

      return [...document.querySelectorAll<HTMLElement>(SELECTOR)]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        })
        .map((el) => {
          const style = getComputedStyle(el);
          const rects = [...el.getClientRects()];
          const tallest = rects.reduce(
            (max, rect) => Math.max(max, rect.height),
            0,
          );
          const own = (el.textContent ?? "").trim();
          const surrounding = (el.parentElement?.textContent ?? "").trim();
          const after = getComputedStyle(el, "::after");
          const stretched =
            after.position === "absolute" &&
            after.content !== "none" &&
            after.inset !== "auto";
          const hitBox =
            stretched && el.offsetParent
              ? el.offsetParent.getBoundingClientRect().height
              : 0;
          return {
            text: (own || el.getAttribute("aria-label") || el.tagName).slice(
              0,
              48,
            ),
            display: style.display,
            lines: rects.length,
            tallest: Math.round(Math.max(tallest, hitBox) * 10) / 10,
            bounding: Math.round(el.getBoundingClientRect().height * 10) / 10,
            stretched,
            inSentence:
              style.display === "inline" && surrounding.length > own.length + 2,
          };
        });
    });

  for (const path of ["/", "/learn"]) {
    test(`item 22: every control on ${path} clears 44px`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);

      const all = await measure(page);
      const controls = all.filter((entry) => !entry.inSentence);
      const undersized = controls.filter((entry) => entry.tallest < 44);
      const exempt = all.filter((entry) => entry.inSentence);

      test.info().annotations.push({
        type: "wcag-2.5.8-inline-exemptions",
        description: JSON.stringify(exempt.map((e) => e.text)),
      });

      expect(
        undersized,
        `controls below the 44px floor on ${path}: ${JSON.stringify(undersized, null, 1)}`,
      ).toEqual([]);
    });
  }

  test("item 22: the learning filter pills clear 44px specifically", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/learn");

    const pills = page.locator('nav[aria-label="Filter resources by type"] a');
    const count = await pills.count();
    expect(count, "no filter pills rendered to measure").toBeGreaterThan(1);

    for (let i = 0; i < count; i += 1) {
      const box = await pills.nth(i).boundingBox();
      expect(
        box!.height,
        `pill "${(await pills.nth(i).innerText()).trim()}" is ${box!.height}px`,
      ).toBeGreaterThanOrEqual(44);
    }
  });
});
