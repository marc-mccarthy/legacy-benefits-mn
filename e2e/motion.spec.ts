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

    // Each heading is scrolled to the centre and asserted individually below.
    // A `scrollIntoViewIfNeeded` preamble here used to duplicate that and was
    // the one flaky step: it ran during hydration and could act on a node
    // Motion had already re-rendered.
    for (const name of ["How we help", "Learning center"]) {
      const target = page.getByRole("heading", { name });
      // Centre it deliberately: scrollIntoViewIfNeeded treats a sliver at the
      // viewport edge as "already visible" and does not scroll, which would
      // leave the element short of the reveal's trigger on small viewports.
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

  test("nothing prints blank", async ({ page }) => {
    // The third door into the same failure, after reduced-motion and noscript.
    // Reveals are served at opacity 0 and only animate in on scroll, so hitting
    // Print without first scrolling to the bottom used to put 13 of 13 sections
    // on paper as blank space. This audience prints — a plan comparison for the
    // kitchen table, a Scope of Appointment for a meeting.
    await page.goto("/");
    await page.emulateMedia({ media: "print" });

    const invisible = await page.evaluate(
      () =>
        [...document.querySelectorAll("[data-reveal]")].filter(
          (el) => Number(getComputedStyle(el).opacity) < 1,
        ).length,
    );
    expect(invisible).toBe(0);

    // The disclosures are the reason the page is worth printing at all, so they
    // must survive print styling even though the navigation does not.
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
