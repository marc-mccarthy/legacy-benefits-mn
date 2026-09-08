import { expect, test } from "@playwright/test";

/**
 * The failure this guards against was observed on one of the reference sites:
 * scroll-reveal animations left whole sections blank in any context where the
 * reveal never fired. On a site whose audience skews older and more likely to
 * enable reduced motion, invisible content is a functional outage.
 */

test.describe("scroll reveal", () => {
  test("content becomes visible when scrolled into view", async ({ page }) => {
    await page.goto("/");

    const heading = page.getByRole("heading", { name: "How we help" });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();

    // A reveal only fires once the element is meaningfully inside the
    // viewport (the wrapper uses a -10% margin), so assert on elements that
    // have been scrolled fully into view rather than every partially
    // intersecting one.
    for (const name of ["How we help", "Learning center"]) {
      const target = page.getByRole("heading", { name });
      // Centre it deliberately: scrollIntoViewIfNeeded treats a sliver at the
      // viewport edge as "already visible" and does not scroll, which leaves
      // the element outside the reveal's -10% margin on short viewports.
      await target.evaluate((el) =>
        el.scrollIntoView({
          block: "center",
          behavior: "instant" as ScrollBehavior,
        }),
      );
      await expect(target).toBeVisible();

      await expect
        .poll(
          async () =>
            target.evaluate((el) => {
              const wrapper = el.closest("[data-reveal]");
              return wrapper ? Number(getComputedStyle(wrapper).opacity) : 1;
            }),
          { timeout: 5000 },
        )
        .toBe(1);
    }
  });

  test("with reduced motion, no content is hidden anywhere on the page", async ({
    browser,
  }) => {
    // Own context, so this holds in every project rather than only the one
    // configured with reduced motion.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const allVisible = await page.evaluate(() =>
      [...document.querySelectorAll("[data-reveal]")].every(
        (el) => Number(getComputedStyle(el).opacity) === 1,
      ),
    );
    expect(allVisible).toBe(true);

    // Section content must be reachable without any scrolling behaviour.
    await expect(
      page.getByRole("heading", { name: "How we help" }),
    ).toBeAttached();

    await context.close();
  });

  test("content is visible with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    // The noscript style must neutralise the server-rendered opacity: 0.
    await expect(
      page.getByRole("heading", { name: "How we help" }),
    ).toBeVisible();
    await expect(page.getByText("We do not offer every plan")).toBeVisible();

    await context.close();
  });
});
