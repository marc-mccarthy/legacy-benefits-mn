import { expect, test } from "@playwright/test";
import {
  builtCss,
  recordViewTransitions,
  transitionCount,
} from "./support/browser";

const EFFECTS_PAUSE = "[data-effects-pause]";

test.describe("scroll reveal", () => {
  test("with reduced motion, no content is hidden anywhere on the page", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const allVisible = await page.evaluate(() =>
      [...document.querySelectorAll("[data-reveal]")].every(
        (el) => Number(getComputedStyle(el).opacity) === 1,
      ),
    );
    expect(allVisible).toBe(true);

    await expect(
      page.getByRole("heading", { name: "How we help" }),
    ).toBeAttached();

    await context.close();
  });

  test("content is visible with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "How we help" }),
    ).toBeVisible();
    await expect(page.getByText("We do not offer every plan")).toBeVisible();

    await context.close();
  });

  test("nothing prints blank", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ media: "print" });

    const invisible = await page.evaluate(
      () =>
        [...document.querySelectorAll("[data-reveal]")].filter(
          (el) => Number(getComputedStyle(el).opacity) < 1,
        ).length,
    );
    expect(invisible).toBe(0);

    const kept = await page.evaluate(() => ({
      disclosures: [...document.querySelectorAll("[data-compliance]")].every(
        (el) => getComputedStyle(el).display !== "none",
      ),
      mainNavHidden:
        getComputedStyle(document.querySelector('nav[aria-label="Main"]')!)
          .display === "none",
    }));
    expect(kept).toEqual({ disclosures: true, mainNavHidden: true });
  });
});

test.describe("effects pause control", () => {
  test("is reachable by keyboard and toggles", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");

    const stops: string[] = [];
    let reached = false;
    for (let i = 0; i < 250 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return "";
        return (el.innerText || el.getAttribute("aria-label") || el.tagName)
          .trim()
          .slice(0, 40);
      });
      stops.push(label);
      reached = label.includes("Pause animations");
    }

    expect(
      reached,
      `never reached the control in 250 tab stops; visited: ${stops.join(" | ")}`,
    ).toBe(true);

    await page.keyboard.press("Enter");
    await expect(page.locator(EFFECTS_PAUSE)).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await context.close();
  });

  test("carries a visible text label, not an icon alone", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");

    const control = page.locator(EFFECTS_PAUSE);
    await expect(control).toHaveCount(1);
    await expect(control).toHaveText(/Pause animations/);

    const box = await control.boundingBox();
    expect(box, "the control has no box at all").not.toBeNull();
    expect(
      box!.width,
      "the control is narrow enough to be icon-only: the words are not being painted",
    ).toBeGreaterThan(100);

    await context.close();
  });
});

test.describe("view transitions", () => {
  const navigate = async (
    page: import("@playwright/test").Page,
    name = "Services",
    path = "services",
  ) => {
    await page
      .locator("header[data-site-header]")
      .getByRole("link", { name, exact: true })
      .first()
      .click();
    await page.waitForURL(`**/${path}`);
  };

  test("without startViewTransition the click still navigates", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      delete (document as unknown as Record<string, unknown>)
        .startViewTransition;
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await navigate(page);
    expect(errors).toEqual([]);

    await context.close();
  });

  test("item 11: the transition overlay never swallows a click", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const css = await builtCss(page);
    expect(
      /::view-transition\s*\{[^}]*pointer-events\s*:\s*none/.test(css),
      "the rule is not in the stylesheet the browser loaded",
    ).toBe(true);

    const phone = page
      .locator('header[data-site-header] a[href^="tel:"]')
      .first();
    await expect(phone).toBeVisible();
    const box = await phone.boundingBox();
    expect(box).not.toBeNull();

    await navigate(page);
    expect(await transitionCount(page)).toBeGreaterThan(0);

    await page.waitForTimeout(600);

    const hit = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el
          ? (el.closest("a")?.getAttribute("href") ?? el.tagName)
          : null;
      },
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
    );
    expect(
      hit,
      "the phone link is not the element under its own centre",
    ).toMatch(/^tel:/);

    await context.close();
  });
});
