import { expect, test } from "@playwright/test";
import { fresh } from "./support/url";

const DESKTOP = { width: 1280, height: 900 };
const NARROW = { width: 390, height: 844 };

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

  test("item 16: locks body scroll while open", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));

    await page.evaluate(() => window.scrollTo(0, 0));
    await openSheet(page);

    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() => window.scrollY),
      "the page scrolled behind the open sheet",
    ).toBe(0);

    expect(
      await page
        .locator("[data-nav-sheet]")
        .evaluate((el) => getComputedStyle(el).overscrollBehavior),
    ).toContain("contain");
  });

  test("item 17: closes on Escape and returns focus to its trigger", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW);
    await page.goto(fresh("/"));
    const { trigger, sheet } = await openSheet(page);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    const label = await trigger.getAttribute("aria-label");
    expect(focused, "focus did not return to the control that opened it").toBe(
      label,
    );
  });

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
  test("item 18: the active nav item carries aria-current", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(fresh("/services"));

    const header = page.locator("header[data-site-header]");
    const current = header.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("href", "/services");

    await expect(
      page.locator('nav[aria-label="Filter resources by type"]'),
    ).toHaveCount(0);

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
      `the active marker is drawn in ${rule.colour}, not the dark-scheme accent`,
    ).toBe("rgb(0, 224, 224)");
  });

  test("item 19: an anchor jump leaves the heading below the condensed header", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(fresh("/"));

    const heading = page.locator("#services-heading");
    await expect(heading, "no in-page anchor target to jump to").toHaveCount(1);

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

    expect(
      measured.headingTop,
      `heading rests at ${measured.headingTop}px with the header ${measured.headerHeight}px tall`,
    ).toBeGreaterThanOrEqual(108);

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

    expect(await cards.count(), "articles were removed from the DOM").toBe(
      total,
    );
    await expect(cards.filter({ visible: true })).not.toHaveCount(total);

    await page.reload();
    await expect(page).toHaveURL(/type=tool/);
    await expect(cards.filter({ visible: true })).not.toHaveCount(total);

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).not.toHaveURL(/type=/);
    await expect(cards.filter({ visible: true })).toHaveCount(total);
  });
});
