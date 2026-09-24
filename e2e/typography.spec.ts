import { expect, test } from "@playwright/test";
import { textSizes } from "./support/browser";

/**
 * The three floors: 16px for anything a reader reads, 36px for the display
 * face, 44px for anything a reader operates.
 *
 * All three were already written down somewhere in this codebase before this
 * work started — in a comment, in a component, in a requirement — and all
 * three were breached in code, in fourteen places, seven places and eleven
 * places respectively. That is the argument for this file existing: a floor
 * that lives in a comment is a preference, and a floor that lives in a test is
 * a floor.
 */

const AUDITED_ROUTES = [
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

/** The widths the reflow suite already exercises, plus an ordinary desktop. */
const WIDTHS = [
  { label: "1440px", width: 1440, height: 900 },
  { label: "720px (200% zoom)", width: 720, height: 450 },
  { label: "360px (400% zoom)", width: 360, height: 225 },
];

// §9.2 item 20 — SC-24, FR-111.
test.describe("the 16px floor", () => {
  for (const path of AUDITED_ROUTES) {
    test(`item 20: no text on ${path} computes below 16px`, async ({
      page,
    }) => {
      await page.goto(path);

      // The legal text is the one thing excluded, and it is excluded because
      // it has a *stricter* floor enforced in its own component rather than a
      // looser one: the disclosure component appends its size class after the
      // caller's, so a page asking for smaller text is overridden rather than
      // obeyed. It is marked in the DOM, so the exclusion is a real boundary
      // rather than a guess at which element came from which file.
      const undersized = (await textSizes(page, "[data-compliance]")).filter(
        (entry) => entry.size < 16,
      );

      expect(
        undersized,
        `below the 16px floor on ${path}: ${JSON.stringify(undersized, null, 1)}`,
      ).toEqual([]);
    });
  }

  test("item 20: the excluded disclosures are above the floor too", async ({
    page,
  }) => {
    // Stated as its own assertion rather than folded into the sweep above.
    // The exclusion exists so the sweep measures the right set, not so the
    // legal text gets a pass — and an exclusion nobody checks is how a floor
    // quietly stops applying to the text it matters most for.
    await page.goto("/");
    const undersized = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-compliance]")]
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => (el.textContent ?? "").trim().slice(0, 40)),
    );
    expect(undersized).toEqual([]);
  });
});

// §9.2 item 21 — SC-24, FR-112, FR-19.
test.describe("the 36px display floor", () => {
  const DISPLAY_ROUTES = [
    "/",
    "/services",
    "/learn",
    "/events",
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

        // The narrow widths are the ones that matter. The outgoing clamp read
        // as correct at desktop and bottomed out at 32px below a 578px
        // viewport, which is the width this audience reaches by zooming — the
        // floor was breached precisely where it was needed.
        expect(
          offenders,
          `display headings below 36px on ${path} at ${label}: ${JSON.stringify(offenders)}`,
        ).toEqual([]);
      });
    }
  }

  test("item 21: the display face is the serif, so the floor is measuring the right thing", async ({
    page,
  }) => {
    // A 36px floor on a class that resolves to the browser's default sans
    // would pass every assertion above while the display face was not being
    // used at all. The font variables in this stylesheet carry no fallback
    // argument, so a mismatched variable name makes the declaration invalid at
    // computed-value time and the element inherits the sans stack instead —
    // silently, with contrast, zoom, axe, typecheck and build all still green.
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
    ).toMatch(/Newsreader/i);
    expect(
      families.body,
      "the body face is a bare fallback stack, not a named family",
    ).toMatch(/[A-Za-z]/);
    expect(families.body).not.toBe(families.display);
  });
});

// §9.2 item 22 — SC-20, FR-114.
test.describe("the 44px target floor", () => {
  /**
   * Interactive elements, measured in a way that can tell a control from a
   * wrapped line of text.
   *
   * The bounding box is the wrong measurement and it was caught being wrong in
   * this run: the announcement bar's inline link measured 49.8px at 390px and
   * 21px at 1440px — the same element, passing the narrow check only because
   * its text had wrapped onto two lines and the box around both was tall. A
   * criterion reading `getBoundingClientRect().height` on an inline element is
   * measuring line wrapping, and it moves with viewport width.
   *
   * The tallest single client rect is the honest number: a wrapped inline link
   * reports the height of one of its lines, which is what a finger actually
   * has to hit.
   */
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
          // A stretched link's target is its card, not its text.
          //
          // The learning and event cards make the whole card clickable by
          // giving the title link an absolutely-positioned `::after` pinned to
          // the card's edges. The anchor's own box is then one line of text —
          // measured at 24px — while the region that actually receives the
          // click is 508px tall. Reading the anchor's rects reports the first
          // number and fails a card that is, in the only sense a finger cares
          // about, twenty times the floor.
          //
          // This is the same error as the wrapped-inline case above, inverted:
          // there the box was larger than the target, here it is smaller. Both
          // come from measuring the element instead of the hit area. The
          // pseudo-element's own box is what the browser hit-tests, so that is
          // what is measured when one is present.
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
            // A link set in running prose. WCAG 2.5.8 exempts a target "in a
            // sentence or block of text" outright, and enforcing 44px on one
            // means lifting every inline link out of its sentence, which is a
            // worse page. They are reported rather than passed silently.
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

      // Recorded on the test itself so the acceptance report can enumerate
      // the exemptions by name rather than asserting that none were taken.
      // An exemption nobody lists is indistinguishable from a miss.
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
    // Named separately because the requirement names them. They computed
    // exactly 36px — eight pixels of padding on each side of a line box the
    // installed theme pairs with 14px type — and raising the type alone gets
    // 40px and still misses. A floor that depends on the type scale to be
    // reached breaks the next time the type scale moves, and the type scale
    // moved in this very change.
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
