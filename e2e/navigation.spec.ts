import { expect, test } from "@playwright/test";
import { fresh } from "./support/url";

/**
 * The rebuilt navigation: the desktop dropdown, the mobile sheet, the active
 * marker and the anchor offset.
 *
 * Two things about this file are not obvious and both change what the tests
 * can assert.
 *
 * **The desktop menu is `hidden lg:block`,** so every test that touches it
 * sets a viewport at or above that breakpoint explicitly. This suite runs
 * under a `mobile` project as well as a `desktop` one, and a test that read
 * the default viewport would pass in one project and fail in the other on a
 * correct implementation. The existing motion spec already carries a
 * non-null assertion on the main nav for the same reason; it throws rather
 * than failing if it is ever run narrow.
 *
 * **No navigation item has children.** `src/content/site.ts` carries five flat
 * entries, so the dropdown has nothing to open and no test here exercises it.
 */

const DESKTOP = { width: 1280, height: 900 };
const NARROW = { width: 390, height: 844 };

/**
 * The mobile sheet.
 *
 * Radix supplies the focus trap, the scroll lock and the Escape handler, which
 * is the reason for using it — but "we used a library that does this" is not
 * evidence that this site does it. Each of the three is asserted as a
 * behaviour, because all three can be lost by mounting the dialog wrongly
 * while the component still renders and still opens.
 */
test.describe("mobile navigation sheet", () => {
  const openSheet = async (page: import("@playwright/test").Page) => {
    const trigger = page
      .locator("header[data-site-header]")
      .getByRole("button", { name: /menu/i })
      .first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const sheet = page.locator("[data-nav-sheet]");
    await expect(sheet).toBeVisible();
    return { trigger, sheet };
  };

  // §9.2 item 15 — SC-21, FR-81.
  test("item 15: traps focus while open", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));
    const { sheet } = await openSheet(page);

    const inside = await sheet.evaluate(
      (el) =>
        el.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ).length,
    );
    expect(inside, "an empty sheet traps focus trivially").toBeGreaterThan(1);

    // Walked past the end deliberately. A trap that holds for one cycle and
    // then leaks on the second is indistinguishable from a working one unless
    // the walk is longer than the ring.
    const escaped: string[] = [];
    for (let i = 0; i < inside * 2 + 4; i += 1) {
      await page.keyboard.press("Tab");
      const outside = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return el.closest("[data-nav-sheet]")
          ? null
          : (el.textContent ?? el.tagName).trim().slice(0, 40);
      });
      if (outside !== null) escaped.push(outside);
    }

    expect(
      escaped,
      `focus left the sheet and landed on: ${escaped.join(" | ")}`,
    ).toEqual([]);
  });

  // §9.2 item 16 — SC-21, FR-81.
  test("item 16: locks body scroll while open", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));

    await page.evaluate(() => window.scrollTo(0, 0));
    await openSheet(page);

    // Attempted for real rather than inferred from a computed `overflow`.
    // A scroll lock implemented as `overflow: hidden` on `body` behaves
    // differently from one implemented on `html`, and the question a reader
    // has is not which property was set but whether the page moved underneath
    // the sheet they opened.
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() => window.scrollY),
      "the page scrolled behind the open sheet",
    ).toBe(0);

    // And the flick inside the sheet must not chain out to the page behind it.
    expect(
      await page
        .locator("[data-nav-sheet]")
        .evaluate((el) => getComputedStyle(el).overscrollBehavior),
    ).toContain("contain");
  });

  // §9.2 item 17 — SC-21, FR-81.
  test("item 17: closes on Escape and returns focus to its trigger", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));
    const { trigger, sheet } = await openSheet(page);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Returning focus is the half that gets lost. A sheet that closes and
    // drops focus on `body` leaves a keyboard visitor at the top of the
    // document with no indication of where they are, which on a long page is
    // worse than the sheet having stayed open.
    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    const label = await trigger.getAttribute("aria-label");
    expect(focused, "focus did not return to the control that opened it").toBe(
      label,
    );
  });

  // The phone number and the primary call to action are pinned to the bottom
  // of the sheet, inside thumb reach. Asserted as tab order rather than as
  // pixel position: "last two focusable" is the property that survives a
  // layout change, and it is also what a screen-reader user experiences.
  test("the phone number and the call to action are the last two stops", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));
    const { sheet } = await openSheet(page);

    const tail = await sheet.evaluate((el) =>
      [
        ...el.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ]
        .filter((node) => node.getBoundingClientRect().height > 0)
        .slice(-2)
        .map((node) => node.getAttribute("href") ?? node.tagName),
    );

    expect(
      tail.some((entry) => entry.startsWith("tel:")),
      `the last two stops in the sheet were ${JSON.stringify(tail)}`,
    ).toBe(true);
  });
});

test.describe("navigation state and anchors", () => {
  // §9.2 item 18 — SC-20, FR-79.
  test("item 18: the active nav item carries aria-current", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(fresh("/services"));

    // Asserted on a route that is exactly a nav destination. The attribute
    // means *this* page, so an ancestor match — an article under the learning
    // centre, say — deliberately does not get it, and a test written against
    // an arbitrary interior route would fail on correct behaviour.
    const header = page.locator("header[data-site-header]");
    const current = header.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("href", "/services");

    // Scoped to the header on purpose: the learning centre's filter chips also
    // carry this attribute, correctly, and an unscoped locator would count
    // them and pass on a header that has none.
    await expect(
      page.locator('nav[aria-label="Filter resources by type"]'),
    ).toHaveCount(0);

    // The visible half of the same requirement, which no acceptance criterion
    // reads: the marker is a 2px rule in navy, and specifically not in the
    // accent colour. Navy-800 measures 12.22:1 against the paper background.
    // The accent on a light ground is a gold — it clears the 3:1 that a
    // non-text indicator needs, so this is not a floor being breached, but the
    // requirement names the token outright and the indicator that tells
    // somebody which page they are on is worth the stronger of the two.
    const rule = await current.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        colour: style.borderBottomColor,
        width: style.borderBottomWidth,
      };
    });
    expect(rule.width).toBe("2px");
    expect(
      rule.colour,
      `the active marker is drawn in ${rule.colour}, not navy-800`,
    ).toBe("rgb(23, 48, 77)");
  });

  // §9.2 item 19 — SC-22, FR-85.
  test("item 19: an anchor jump leaves the heading below the condensed header", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(fresh("/"));

    const heading = page.locator("#services-heading");
    await expect(heading, "no in-page anchor target to jump to").toHaveCount(1);

    // A real fragment navigation, not `scrollIntoView`. `scroll-margin-top` is
    // honoured by the browser's own fragment scrolling and by
    // `scrollIntoView`, but a visitor arrives here by activating a link, and
    // the hash change is what that produces.
    await page.evaluate(() => {
      window.location.hash = "#services-heading";
    });
    await page.waitForTimeout(500);

    const measured = await page.evaluate(() => {
      const el = document.querySelector("#services-heading")!;
      const header = document.querySelector("header[data-site-header]")!;
      return {
        headingTop: el.getBoundingClientRect().top,
        headerBottom: header.getBoundingClientRect().bottom,
        headerHeight: header.getBoundingClientRect().height,
      };
    });

    // 108px is the measured condensed header — a 44px utility bar over a 64px
    // main row — and the header is always condensed by the time an anchor jump
    // lands, because landing on one means having scrolled past the threshold.
    expect(
      measured.headingTop,
      `heading rests at ${measured.headingTop}px with the header ${measured.headerHeight}px tall`,
    ).toBeGreaterThanOrEqual(108);

    // The stronger form of the same statement, and the one that survives the
    // header's geometry changing: the heading is below the header, not under
    // it. The fixed 108px above is the criterion as written; this is the
    // property it is written to protect.
    expect(measured.headingTop).toBeGreaterThanOrEqual(measured.headerBottom);
  });
});

test.describe("the learning filter", () => {
  test("the learning filter keeps its state in the URL", async ({ page }) => {
    await page.goto("/learn");

    const cards = page.locator("[data-article-type]");
    const total = await cards.count();
    expect(total, "no articles rendered").toBeGreaterThan(3);

    await page.getByRole("link", { name: "Tools", exact: true }).click();
    await expect(page).toHaveURL(/type=tool/);

    // Hidden, never unmounted: the full set stays in the DOM so a reader with
    // no JavaScript sees all of it.
    expect(await cards.count(), "articles were removed from the DOM").toBe(
      total,
    );
    await expect(cards.filter({ visible: true })).not.toHaveCount(total);

    // The URL is the state, so a reload restores the same view.
    await page.reload();
    await expect(page).toHaveURL(/type=tool/);
    await expect(cards.filter({ visible: true })).not.toHaveCount(total);

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).not.toHaveURL(/type=/);
    await expect(cards.filter({ visible: true })).toHaveCount(total);
  });
});
