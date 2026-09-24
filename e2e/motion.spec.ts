import { expect, test } from "@playwright/test";
import {
  builtCss,
  lastTransitionAnimations,
  recordViewTransitions,
  transitionCount,
} from "./support/browser";

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

    // The hero's cross-fade frames are <img> elements, so zeroing backgrounds
    // does not stop them printing — three full-bleed photographs on page one.
    const heroMotion = page.locator("[data-hero-motion]");
    if (await heroMotion.count()) {
      await expect(heroMotion).toBeHidden();
    }
  });
});

/**
 * The hero cross-fade. Every assertion here is about the motion NOT running:
 * the still photograph is the hero, and the moving version is an addition that
 * has to remove itself cleanly in each of the contexts below.
 */
test.describe("hero motion", () => {
  // Exact text, not `has-text`. `has-text` is substring matching, and the
  // closing band's point field names its own control "Pause background field"
  // — which contains this string. The two controls are deliberately named
  // differently so that a count of zero for one is not satisfied by the other,
  // and a substring locator throws that distinction away: it resolved to 2
  // elements here and failed in strict mode, which reads as "the hero control
  // is missing" when both are present and correct.
  const pauseButton = "button:text-is('Pause background')";

  test("cross-fades, and the pause control stops it", async ({ page }) => {
    await page.goto("/");

    const layer = page.locator("[data-hero-motion]");
    // The layer only exists after hydration — it is deliberately absent from
    // the server render, so counting immediately after goto() always finds
    // zero and silently skips the whole test. Wait for it first, and treat a
    // real absence (a hero with no slides authored, which is a still hero by
    // design) as the only reason to skip.
    const present = await layer
      .waitFor({ state: "attached", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!present, "home hero has no slides authored; nothing to pause");

    // The tab must be foregrounded for the timer to run at all, which is
    // itself one of the guarantees: no animation in a background tab.
    await expect(layer).toHaveAttribute("data-running", "true");

    const pause = page.locator(pauseButton);
    await expect(pause).toBeVisible();
    await pause.click();

    await expect(
      page.locator("button:has-text('Play background')"),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(layer).toHaveAttribute("data-running", "false");

    // Sampled rather than waited out: the dwell between photographs is nine
    // seconds and must not become this test's runtime. A frozen transform and
    // a frozen slide index are what "paused" means.
    const sample = () =>
      page.evaluate(() => {
        const root = document.querySelector("[data-hero-motion]")!;
        const frame = root.querySelector(
          '[data-hero-frame][data-active="true"]',
        );
        return {
          slide: root.getAttribute("data-slide"),
          transform: frame ? getComputedStyle(frame).transform : null,
          playState: frame ? getComputedStyle(frame).animationPlayState : null,
        };
      });

    // Two animation frames between the pause landing and the first sample.
    // Without them this compares a transform read mid-commit against one read
    // 1200ms later and fails on a difference of 4e-5 —
    // `matrix(1.00007…)` against `matrix(1.00011…)` — which is one frame of a
    // 22-second drift across 6% of scale, not a running animation. The
    // assertion that matters is the one below it: `animationPlayState` reports
    // `paused`, and a paused animation that had kept running would drift by a
    // great deal more than the fifth decimal place over 1200ms.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );

    const before = await sample();
    await page.waitForTimeout(1200);
    expect(await sample()).toEqual(before);
    expect(before.playState).toBe("paused");
  });

  test("with reduced motion there is no moving layer and no control", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    // The photograph and the copy are untouched; only the motion is absent,
    // and with it the control — nobody is offered a button that does nothing.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-hero-motion]")).toHaveCount(0);
    await expect(page.locator(pauseButton)).toHaveCount(0);

    await context.close();
  });

  test("without JavaScript the hero is the still photograph", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-hero-motion]")).toHaveCount(0);
    await expect(page.locator(pauseButton)).toHaveCount(0);

    await context.close();
  });
});

/**
 * The particle field, and the reason this block is written the way it is.
 *
 * Every other assertion about this component is an assertion that it is
 * ABSENT: zero canvases under reduced motion, zero with JavaScript disabled,
 * zero in the server HTML, zero pause controls when the browser refuses a 2D
 * context, hidden on paper. Thirteen criteria were counted against this
 * feature and twelve of them pass if the component is never built, because an
 * absence assertion is satisfied by absence. The one that fails is "the file
 * exists", and an empty file passes that.
 *
 * So the positive assertions below are not extra coverage. They are the half
 * that makes the other half mean anything, and there are three of them: the
 * field is there exactly once, its control is there and carries a label a
 * person can read, and THE PIXELS ACTUALLY MOVE. A canvas that renders one
 * frame and stops satisfies every presence check ever written about it and is
 * not a particle field.
 *
 * There is deliberately no `test.skip` anywhere in this block.
 * `e2e/motion.spec.ts` is the file the spec points at as the shape a new
 * motion test should take, and the shape it teaches is a skip on an attach
 * wait — correct for the hero, whose comment above records the bug of counting
 * before hydration, and whose absence is a real authored state (a poster with
 * no slides is a still hero by design). The particle field has no such state:
 * exactly one instance exists, unconditionally, in the closing band. A timeout
 * waiting for it is a failure and must be reported as one.
 *
 * Each test opens its own context with an explicit motion preference, because
 * this file also runs under the `reduced-motion` project in
 * `playwright.config.ts`. A test that relied on the default `page` fixture
 * would assert the field is present in two projects and absent in the third,
 * and would have to be written to tolerate both — which is another way of
 * spelling "passes either way".
 */
test.describe("particle field", () => {
  const FIELD = "[data-particle-field]";
  const CANVAS = "[data-particle-field] canvas";
  const PAUSE = "button:has-text('Pause background field')";
  const PLAY = "button:has-text('Play background field')";

  /** A context with motion explicitly enabled, whatever project is running. */
  const withMotion = async (browser: import("@playwright/test").Browser) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    return { context, page };
  };

  /**
   * Bring the field on screen and wait until it is genuinely running.
   *
   * Two gates have to be satisfied before a single pixel moves, and both are
   * requirements rather than implementation details: an `IntersectionObserver`
   * so the loop stops once the reader has scrolled past the band, and a
   * `visibilitychange` listener so it stops in a background tab. The field
   * sits at the foot of the page, so a test that samples it straight after
   * `goto()` samples a component that is correctly doing nothing.
   */
  const settled = async (page: import("@playwright/test").Page) => {
    const root = page.locator(FIELD);
    await root.waitFor({ state: "attached", timeout: 15_000 });
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-running", "true");
    return root;
  };

  // §9.2 item 1 — SC-2, FR-63.
  test("item 1: renders zero canvases and zero pause controls under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    // Absence, not stillness. A paused canvas would satisfy a "nothing is
    // moving" check and would still be a moving layer offered to someone who
    // asked the operating system for none.
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(FIELD)).toHaveCount(0);
    await expect(page.locator(PAUSE)).toHaveCount(0);
    await expect(page.locator(PLAY)).toHaveCount(0);

    // The band itself is untouched: the effect is additive and its absence
    // must not take the closing call to action with it.
    await expect(
      page.locator("main section").last().getByRole("heading", { level: 2 }),
    ).toBeVisible();

    await context.close();
  });

  // §9.2 item 2 — SC-3, FR-64.
  test("item 2: renders zero canvases with JavaScript disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    // With no client code running this is also the server HTML, which is what
    // makes the same assertion cover the pre-hydration render: there is no
    // instant between paint and hydration at which a canvas exists.
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(FIELD)).toHaveCount(0);
    await expect(page.locator(PAUSE)).toHaveCount(0);

    await context.close();
  });

  // §9.2 item 3 — SC-4, FR-65.
  test("item 3: the root is hidden under print, by the rule that names it", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    const root = await settled(page);

    // The order here is the whole test. Playwright reports an element that is
    // not in the document as hidden, so asserting "hidden under print" against
    // a page that never rendered the field passes. Prove it is there first.
    await expect(root).toHaveCount(1);

    // And prove which rule is doing the work. The print block carries a
    // blanket rule hiding anything marked as print-hidden, which predates this
    // work and exists for the pause control. If the root carried that marker
    // too, this criterion would pass on the blanket rule while the rule that
    // names the field by selector was never written — and the floor would
    // disappear the day someone removed the marker for an unrelated reason,
    // with every gate green.
    await expect(root).not.toHaveAttribute("data-print-hide", /.*/);

    await page.emulateMedia({ media: "print" });
    await expect(root).toBeHidden();
    expect(
      await root.evaluate((el) => getComputedStyle(el).display),
      "the named selector inside the print block is the only thing that can be hiding this",
    ).toBe("none");

    await context.close();
  });

  // §9.2 item 4 — SC-1, FR-62. The first of the three positive assertions.
  test("item 4: exactly one field exists, and its pause control exists with it", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

    // Exactly one, not "at least one". The requirement is a single instance
    // site-wide; a second one mounted in the hero would look like a richer
    // effect and would double the frame cost on the machines least able to
    // pay it.
    await expect(page.locator(FIELD)).toHaveCount(1);
    await expect(page.locator(CANVAS)).toHaveCount(1);

    // If and only if: a control for motion that is not running is a button
    // that does nothing, and a running effect with no control fails WCAG
    // 2.2.2 outright.
    await expect(page.locator(PAUSE)).toHaveCount(1);
    await expect(page.locator(PAUSE)).toBeVisible();

    await context.close();
  });

  // §9.2 item 5 — SC-1, FR-62.
  test("item 5: the pause control is reachable by keyboard", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

    // Walked rather than focused programmatically. `locator.focus()` proves
    // the element can hold focus, which is not the question: an element can be
    // focusable and still be unreachable, because it sits inside a container
    // marked hidden from assistive technology, or carries a negative tab
    // index, or is painted over. The canvas root beside this control IS marked
    // hidden from assistive technology, deliberately, so the distinction is
    // live in this exact component.
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
      reached = label.includes("Pause background field");
    }

    expect(
      reached,
      `never reached the control in 250 tab stops; visited: ${stops.join(" | ")}`,
    ).toBe(true);

    // And operable from there, not merely reachable.
    await page.keyboard.press("Enter");
    await expect(page.locator(PLAY)).toHaveAttribute("aria-pressed", "true");

    await context.close();
  });

  // §9.2 item 6 — SC-1, §7.5 item 5. The second positive assertion.
  test("item 6: the pause control carries a visible text label, not an icon alone", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

    const control = page.locator(PAUSE);
    await expect(control).toHaveText(/Pause background field/);

    // The string is checked for being *rendered*, not merely present. A label
    // supplied only to assistive technology is clipped to a one-pixel box, and
    // both an icon-only button and a properly labelled one would satisfy a
    // text assertion — one of them by carrying the words where nobody can read
    // them. Two glyphs differing by a triangle are a poor distinction for the
    // eyes this site is built for.
    const box = await control.boundingBox();
    expect(box, "the control has no box at all").not.toBeNull();
    expect(
      box!.width,
      "the control is narrow enough to be icon-only: the words are not being painted",
    ).toBeGreaterThan(100);

    // Distinct from the hero's control, and that matters rather than being
    // tidy: the hero's strings are asserted at a count of zero under reduced
    // motion, and a shared string would let that assertion pass with the wrong
    // component on screen.
    //
    // `text-is`, not `has-text`. This assertion is the one that proves the two
    // names are distinct, so matching it by substring defeats its own purpose:
    // "Pause background field" contains "Pause background", so `has-text`
    // returns both controls and the count is 2. Exact matching is what makes
    // the claim in the paragraph above actually checked.
    await expect(
      page.locator("button:text-is('Pause background')"),
    ).toHaveCount(1);

    await context.close();
  });

  // §9.2 item 7 — SC-1, FR-62. The third positive assertion, and the one that
  // distinguishes a particle field from a picture of one.
  test("item 7: the motion runs, and pressing the control freezes it", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    const root = await settled(page);

    const frame = () =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          "[data-particle-field] canvas",
        );
        return canvas ? canvas.toDataURL() : null;
      });

    // Sampled rather than waited out, and sampled as pixels rather than as
    // attributes. `data-running="true"` is a claim the component makes about
    // itself; two different images 300ms apart are the claim being true. At 6
    // to 14 pixels per second a point moves between 1.8 and 4.2 pixels in that
    // window, which is more than the radius of the points being drawn.
    const before = await frame();
    expect(before, "no canvas to sample").not.toBeNull();
    await page.waitForTimeout(300);
    const after = await frame();
    expect(
      after,
      "two frames 300ms apart are byte-identical: the canvas is static",
    ).not.toBe(before);

    await page.locator(PAUSE).click();
    await expect(root).toHaveAttribute("data-running", "false");
    await expect(root).toHaveAttribute("data-paused", "true");
    await expect(page.locator(PLAY)).toHaveAttribute("aria-pressed", "true");

    // One frame may already be in flight when the click lands, so the first
    // sample is taken after the state has settled rather than immediately.
    await page.waitForTimeout(100);
    const frozen = await frame();
    await page.waitForTimeout(300);
    expect(await frame(), "the field kept moving after it was paused").toBe(
      frozen,
    );

    await context.close();
  });

  // §9.2 item 8 — SC-29, FR-56.
  test("item 8: renders nothing and throws nothing when the 2D context is null", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      // Exactly the browser's own behaviour under memory pressure or with
      // canvas disabled: the call succeeds and hands back nothing.
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: unknown[]
      ) {
        if (args[0] === "2d") return null;
        return (
          original as unknown as (
            this: HTMLCanvasElement,
            ...rest: unknown[]
          ) => unknown
        ).apply(this, args);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");

    // No control, because there is no motion for it to control — and the
    // control must never exist for an instant and then be removed, which is
    // what a probe run inside an effect rather than before the first render
    // would produce.
    await expect(page.locator(PAUSE)).toHaveCount(0);
    await expect(page.locator(CANVAS)).toHaveCount(0);

    // The band underneath is untouched. This is the test of whether the effect
    // was ever load-bearing: a heading, a sentence and a button on navy.
    await expect(
      page.locator("main section").last().getByRole("heading", { level: 2 }),
    ).toBeVisible();

    expect(errors, `uncaught errors: ${errors.join(" | ")}`).toEqual([]);

    await context.close();
  });

  /**
   * The 80-point cap, which is a performance limit with no acceptance
   * criterion attached to it.
   *
   * The limit says to read the count off the component's own density
   * calculation at a 2560px-wide viewport, and that wording is load-bearing: a
   * test that recomputes the formula it is checking passes whatever the
   * component does. The component publishes its own answer in the DOM so the
   * number can be read rather than re-derived.
   *
   * The cap matters on exactly the machines least able to pay for it. Uncapped,
   * a 2560x900 band asks for 106 points — the same effect, three times the
   * per-frame cost, and a density that reads as noise rather than as a sky.
   */
  test("the point count is capped at 80 on a very wide viewport", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/");
    const root = await settled(page);

    const points = Number(await root.getAttribute("data-points"));
    expect(
      points,
      "the field reported no points at all, so the cap is not what is holding this down",
    ).toBeGreaterThan(0);
    expect(
      points,
      `the density calculation returned ${points} points at 2560px wide`,
    ).toBeLessThanOrEqual(80);

    await context.close();
  });
});

/**
 * Page transitions.
 *
 * The same disease as the block above, in a sharper form. Every
 * `::view-transition-*` pseudo-element exists only while a transition is
 * running, so a site with no page transitions at all satisfies "the header's
 * group does not animate", "the durations are zero under reduced motion" and
 * "there are no directional slide keyframes" — the last one vacuously, over an
 * empty rule set.
 *
 * So the first assertion in this block is that a transition happens, and
 * everything else is conditioned on that having been observed. It also catches
 * a specific design risk rather than a hypothetical one: the transition
 * boundary is mounted in a layout, and the shipped Next guide says in as many
 * words that enter and exit never fire from a layout. The keyed boundary is
 * what defeats that, and this is the assertion that would notice if it stopped
 * working.
 */
test.describe("view transitions", () => {
  /** A navigation that changes the path, so the boundary's key changes. */
  const navigate = async (page: import("@playwright/test").Page) => {
    await page
      .locator("header[data-site-header]")
      .getByRole("link", { name: "Services" })
      .first()
      .click();
    await page.waitForURL("**/services");
  };

  // §9.2 items 9 — SC-2, FR-48.
  test("item 9: the three view-transition pseudo-elements animate for 0s under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await navigate(page);

    // Without this the rest of the test is an assertion about nothing. The
    // reduced-motion rule is written for pseudo-elements the existing global
    // block's universal selector does not reach; if the transition never
    // starts, neither the rule nor its absence is observable.
    expect(
      await transitionCount(page),
      "no view transition started, so nothing below was measured",
    ).toBeGreaterThan(0);

    const animations = await lastTransitionAnimations(page);
    const moving = animations.filter(
      (entry) => entry.durationMs > 0 || entry.delayMs > 0,
    );
    expect(
      moving,
      `these kept their timing under reduced motion: ${JSON.stringify(moving)}`,
    ).toEqual([]);

    await context.close();
  });

  // §9.2 item 10 — SC-18, FR-47.
  test("item 10: the site header is a named participant and does not animate", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    // Half of this criterion is free unless the header is named. "No group
    // called site-header animates" is true of a site where nothing is called
    // site-header, which is the state this codebase was in before the
    // rebuild — so the name is asserted first, as a computed value rather
    // than by reading the component.
    expect(
      await page
        .locator("header[data-site-header]")
        .evaluate((el) => getComputedStyle(el).viewTransitionName),
    ).toBe("site-header");

    await navigate(page);
    expect(await transitionCount(page)).toBeGreaterThan(0);

    const animations = await lastTransitionAnimations(page);
    const header = animations.filter((entry) =>
      entry.pseudo.includes("site-header"),
    );
    const moving = header.filter((entry) => entry.durationMs > 0);
    expect(
      moving,
      `the header animated during the crossfade: ${JSON.stringify(moving)}`,
    ).toEqual([]);

    // And the page content did move, so this is not passing because the whole
    // transition was inert.
    const content = animations.filter(
      (entry) => !entry.pseudo.includes("site-header") && entry.durationMs > 0,
    );
    expect(
      content.length,
      `nothing animated at all: ${JSON.stringify(animations)}`,
    ).toBeGreaterThan(0);

    await context.close();
  });

  /**
   * FR-45's timings, which no acceptance criterion reads.
   *
   * The criteria written about the crossfade are "zero directional slide
   * keyframes" and the four header rules. Both are satisfied by a crossfade
   * running at the wrong speed, by one running at the user agent's default,
   * and by one where the two halves overlap — which is the failure the
   * requirement is actually about, because two versions of the same words at
   * partial opacity are harder to read than either alone.
   *
   * The animation *names* are matched rather than the pseudo-element strings.
   * React assigns the pseudo-element's name itself, so it is an opaque token
   * that changes between transitions; the keyframes are named in the
   * stylesheet and are stable.
   */
  test("the crossfade runs 180ms out then 240ms in, and the chrome does not animate", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await navigate(page);
    expect(await transitionCount(page)).toBeGreaterThan(0);

    const animations = await lastTransitionAnimations(page);
    const out = animations.find((entry) => entry.name === "page-fade-out");
    const into = animations.find((entry) => entry.name === "page-fade-in");

    expect(
      out,
      `no exit keyframe ran: ${JSON.stringify(animations)}`,
    ).toBeDefined();
    expect(
      into,
      `no enter keyframe ran: ${JSON.stringify(animations)}`,
    ).toBeDefined();

    expect(out!.durationMs).toBe(180);
    expect(out!.delayMs).toBe(0);
    expect(into!.durationMs).toBe(240);
    // Delayed by exactly the exit's duration, so at no instant are two
    // versions of the page both partly opaque.
    expect(into!.delayMs).toBe(180);
    expect(out!.delayMs + out!.durationMs).toBeLessThanOrEqual(into!.delayMs);

    // The root snapshot is everything outside the named boundary — on this
    // site, the header and the footer. Left alone it runs the user agent's own
    // 250ms fade, which is longer than either half of the authored crossfade
    // and overlaps both: a second, slower animation nobody specified, running
    // underneath the one that was. Measured at 250ms in this run before the
    // rule that stops it was written.
    const root = animations.filter(
      (entry) => entry.pseudo.includes("(root)") && entry.durationMs > 0,
    );
    expect(
      root,
      `the root snapshot is still animating: ${JSON.stringify(root)}`,
    ).toEqual([]);

    await context.close();
  });

  // §9.2 item 11 — SC-18, FR-47.
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

    // The binding half, and the one that can fail. A view-transition
    // pseudo-element never becomes an event target, so no click test can
    // observe the declaration directly — but the rule can be lost on the way
    // to the browser, which is the failure that actually happens: Tailwind
    // minifies through Lightning CSS and a pseudo-element it does not
    // recognise is dropped with no error. Reading the served bytes is what
    // notices.
    const css = await builtCss(page);
    expect(
      /::view-transition\s*\{[^}]*pointer-events\s*:\s*none/.test(css),
      "the rule is not in the stylesheet the browser loaded",
    ).toBe(true);

    // The regression guard beside it: with the transition in flight, the top
    // task on this site is still hittable. This would also catch a real
    // element overlay, which is the shape a future "fix" is most likely to
    // take.
    const phone = page
      .locator('header[data-site-header] a[href^="tel:"]')
      .first();
    await expect(phone).toBeVisible();
    const box = await phone.boundingBox();
    expect(box).not.toBeNull();

    await navigate(page);
    expect(await transitionCount(page)).toBeGreaterThan(0);

    // Sampled during the transition, this assertion fails — and the reason is
    // worth recording rather than designing around, because it is a real cost
    // and not a test artefact.
    //
    // Measured at the phone link's own centre across one navigation:
    //   t=0 BODY · t=60 BODY · t=150 BODY · t=300 BODY · t=500 tel:6512601003
    //
    // The overlay is not the cause; the `pointer-events: none` rule asserted
    // above is present and doing its job. The cause is that FR-47 names the
    // header `site-header` so it will not animate, and the platform lifts any
    // named element into a snapshot for the duration — a snapshot is painted
    // in place of the live element and is not hit-tested. So for roughly the
    // 420ms of a transition the phone number, which is the top task on this
    // site, does not respond to a click. The visitor clicks again.
    //
    // The alternative is not naming the header, which puts it back in the root
    // snapshot and lets it fade with the page on every navigation — worse, and
    // the thing FR-47 exists to prevent. The trade is accepted and documented
    // rather than hidden behind a test that samples after it has passed.
    //
    // What this assertion can honestly guarantee is the part a regression
    // would break: that nothing this work added leaves a real element covering
    // the header once the transition has finished.
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

/**
 * The shared-element morph.
 *
 * `view-transition-name` is assigned by React only while a transition is
 * running, so in the settled DOM there is nothing to quantify over — which is
 * why "both ends of every pair carry the same configuration" passes on a site
 * where no pair was ever mounted. The component emits a static attribute
 * carrying the derived name for exactly this reason, and it is what the first
 * assertion below reads.
 */
test.describe("shared-element morph", () => {
  // §9.2 item 12 — SC-19, FR-50. The fifth positive assertion.
  test("item 12: a card and its destination derive the same morph name", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/learn");

    const cardEnd = page.locator("[data-morph]").first();
    await expect(
      cardEnd,
      "no morph end exists anywhere on the learning index: the pair was never mounted",
    ).toHaveCount(1);

    const name = await cardEnd.getAttribute("data-morph");
    expect(name).toMatch(/^morph-learn-/);

    // Follow the card this end belongs to, rather than guessing a slug: the
    // pair is only meaningful between an image and the page it travels to.
    const href = await cardEnd.evaluate(
      (el) =>
        el.closest("li")?.querySelector("a")?.getAttribute("href") ?? null,
    );
    expect(
      href,
      "the morph end is not inside a card that links anywhere",
    ).not.toBeNull();

    // Activated rather than navigated to. `page.goto` is a full document load
    // and starts no view transition at all, so the timings below would have
    // nothing to read — and the morph is a property of the journey between the
    // two pages, not of either page on its own.
    await page.locator(`a[href="${href}"]`).first().click();
    await page.waitForURL(`**${href}`);

    // Both ends, same string, derived by one function imported by both files.
    // A template literal copied into two files owned by two people is the most
    // likely way for a pair to drift, and a drifted name does not error — the
    // ends simply never find each other.
    await expect(page.locator(`[data-morph="${name}"]`)).toHaveCount(1);

    // FR-51's timing, which no acceptance criterion reads either. The pair
    // forming is necessary and not sufficient: a pair that forms and then
    // snaps has the continuity the effect exists for and none of the
    // legibility, and the blur is what hides the pixel-level interpolation
    // artefacts while the image is in flight.
    expect(
      await transitionCount(page),
      "activating the card started no transition, so the pair never travelled",
    ).toBeGreaterThan(0);

    const animations = await lastTransitionAnimations(page);
    const group = animations.filter(
      (entry) =>
        entry.pseudo.startsWith("::view-transition-group") &&
        entry.durationMs > 0,
    );
    expect(
      group.some((entry) => entry.durationMs === 400),
      `no morph group ran for 400ms: ${JSON.stringify(animations)}`,
    ).toBe(true);
    expect(
      animations.some((entry) => entry.name === "morph-blur"),
      `the blur keyframe did not run: ${JSON.stringify(animations)}`,
    ).toBe(true);

    await context.close();
  });
});

/**
 * The four contexts every animation on this site has to render visible in:
 * reduced motion, no JavaScript, print, and before hydration. The components
 * added for the motion pass are checked here against the same rules the
 * existing ones already pass.
 */
test.describe("motion added by the scroll pass", () => {
  test("no-JS: every band is visible and no heading is empty", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    const bands = page.locator("main [data-band], main section");
    const count = await bands.count();
    expect(count, "no bands rendered at all").toBeGreaterThan(0);

    const collapsed = await page.evaluate(() =>
      [...document.querySelectorAll("main [data-band], main section")]
        .filter((el) => {
          const style = getComputedStyle(el);
          return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) === 0 ||
            el.getBoundingClientRect().height === 0
          );
        })
        .map((el) => el.className || el.tagName),
    );
    expect(collapsed, "bands with no JavaScript are not visible").toEqual([]);

    const emptyHeadings = await page.evaluate(() =>
      [...document.querySelectorAll("main h1, main h2, main h3")]
        .filter((el) => (el.textContent ?? "").trim() === "")
        .map((el) => el.tagName),
    );
    expect(emptyHeadings, "a heading's text is produced by JavaScript").toEqual(
      [],
    );

    await context.close();
  });

  test("print: 13 of 13 sections render", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ media: "print" });

    const blank = await page.evaluate(() => {
      const bands = [...document.querySelectorAll("main [data-band]")];
      return {
        total: bands.length,
        blank: bands.filter((el) => {
          const style = getComputedStyle(el);
          return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) === 0 ||
            // `content-visibility: auto` must not survive into print: a band
            // the printer never scrolls into view would otherwise have no
            // layout at all.
            style.contentVisibility === "hidden" ||
            el.getBoundingClientRect().height === 0
          );
        }).length,
      };
    });

    expect(blank.total, "no bands to print").toBeGreaterThan(0);
    expect(
      blank.blank,
      `${blank.blank} of ${blank.total} bands print blank`,
    ).toBe(0);
  });

  test("the curtain reveal is open at rest and mounts no closed state under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      javaScriptEnabled: true,
    });
    const page = await context.newPage();
    await page.goto("/");

    const curtains = page.locator("[data-curtain]");
    if ((await curtains.count()) === 0) {
      test.skip(true, "no curtain on this route");
    }

    const clips = await page.evaluate(() =>
      [...document.querySelectorAll("[data-curtain]")].map(
        (el) => getComputedStyle(el).clipPath,
      ),
    );
    // Anything other than the finished frame would be hiding content.
    for (const clip of clips) {
      expect(
        clip === "none" || clip.includes("inset(0"),
        `clipPath ${clip}`,
      ).toBe(true);
    }

    await context.close();
  });

  test("lit words are all in the DOM and fully lit under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const paragraph = page.locator("[data-lit-words]").first();
    if ((await paragraph.count()) === 0) {
      test.skip(true, "no lit-words paragraph on this route");
    }

    // Every word present as text at first paint, not produced by the effect.
    const text = ((await paragraph.textContent()) ?? "").trim();
    expect(
      text.split(/\s+/).length,
      "the paragraph has no words",
    ).toBeGreaterThan(3);

    const litColours = await page.evaluate(() => {
      const root = document.querySelector("[data-lit-words]");
      if (!root) return [];
      const onSurface = getComputedStyle(root)
        .getPropertyValue("--scheme-on-surface")
        .trim();
      return [...root.querySelectorAll("span[aria-hidden]")].map((el) => ({
        opacity: Number(getComputedStyle(el).opacity),
        onSurface,
      }));
    });

    expect(litColours.length, "no lit layer rendered").toBeGreaterThan(3);
    for (const word of litColours) {
      expect(word.opacity, "a word is not fully lit under reduced motion").toBe(
        1,
      );
    }

    await context.close();
  });

  test("the hero background does not translate under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);

    const transform = await page.evaluate(() => {
      const el = document.querySelector("[data-hero-parallax]");
      return el ? getComputedStyle(el).transform : null;
    });

    expect(
      transform === null ||
        transform === "none" ||
        transform === "matrix(1, 0, 0, 1, 0, 0)",
      `hero background moved under reduced motion: ${transform}`,
    ).toBe(true);

    await context.close();
  });
});
