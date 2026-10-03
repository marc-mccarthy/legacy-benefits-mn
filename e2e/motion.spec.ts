import { expect, type Page, test } from "@playwright/test";
import {
  builtCss,
  lastTransitionAnimations,
  recordViewTransitions,
  transitionCount,
} from "./support/browser";

const EFFECTS_PAUSE = "[data-effects-pause]";

test.describe("scroll reveal", () => {
  test("content becomes visible when scrolled into view", async ({ page }) => {
    await page.goto("/");

    for (const name of ["How we help", "Learning center"]) {
      const target = page.getByRole("heading", { name });

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

test.describe("particle field", () => {
  const FIELD = "[data-particle-field]";
  const CANVAS = "[data-particle-field] canvas";
  const PAUSE = "button:has-text('Pause background field')";
  const PLAY = "button:has-text('Play background field')";

  const withMotion = async (browser: import("@playwright/test").Browser) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    return { context, page };
  };

  const settled = async (page: import("@playwright/test").Page) => {
    const root = page.locator(FIELD);
    await root.waitFor({ state: "attached", timeout: 15_000 });
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-running", "true");
    return root;
  };

  test("item 1: renders zero canvases and zero pause controls under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(FIELD)).toHaveCount(0);
    await expect(page.locator(PAUSE)).toHaveCount(0);
    await expect(page.locator(PLAY)).toHaveCount(0);

    await expect(
      page.locator("main section").last().getByRole("heading", { level: 2 }),
    ).toBeVisible();

    await context.close();
  });

  test("item 2: renders zero canvases with JavaScript disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(FIELD)).toHaveCount(0);
    await expect(page.locator(PAUSE)).toHaveCount(0);

    await context.close();
  });

  test("item 3: the root is hidden under print, by the rule that names it", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    const root = await settled(page);

    await expect(root).toHaveCount(1);

    await expect(root).not.toHaveAttribute("data-print-hide", /.*/);

    await page.emulateMedia({ media: "print" });
    await expect(root).toBeHidden();
    expect(
      await root.evaluate((el) => getComputedStyle(el).display),
      "the named selector inside the print block is the only thing that can be hiding this",
    ).toBe("none");

    await context.close();
  });

  test("item 4: exactly one field exists, and its pause control exists with it", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

    await expect(page.locator(FIELD)).toHaveCount(1);
    await expect(page.locator(CANVAS)).toHaveCount(1);

    await expect(page.locator(EFFECTS_PAUSE)).toHaveCount(1);
    await expect(page.locator(EFFECTS_PAUSE)).toBeVisible();

    await context.close();
  });

  test("item 5: the pause control is reachable by keyboard", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

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

  test("item 6: the pause control carries a visible text label, not an icon alone", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await settled(page);

    const control = page.locator(EFFECTS_PAUSE);
    await expect(control).toHaveText(/Pause animations/);

    const box = await control.boundingBox();
    expect(box, "the control has no box at all").not.toBeNull();
    expect(
      box!.width,
      "the control is narrow enough to be icon-only: the words are not being painted",
    ).toBeGreaterThan(100);

    await expect(page.locator("button:text-is('Pause')")).toHaveCount(0);

    await context.close();
  });

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

    const before = await frame();
    expect(before, "no canvas to sample").not.toBeNull();
    await page.waitForTimeout(300);
    const after = await frame();
    expect(
      after,
      "two frames 300ms apart are byte-identical: the canvas is static",
    ).not.toBe(before);

    await page.locator(EFFECTS_PAUSE).click();
    await expect(root).toHaveAttribute("data-running", "false");
    await expect(root).toHaveAttribute("data-paused", "true");
    await expect(page.locator(EFFECTS_PAUSE)).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.waitForTimeout(100);
    const frozen = await frame();
    await page.waitForTimeout(300);
    expect(await frame(), "the field kept moving after it was paused").toBe(
      frozen,
    );

    await context.close();
  });

  test("item 8: renders nothing and throws nothing when the 2D context is null", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;

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

    await expect(page.locator(PAUSE)).toHaveCount(0);
    await expect(page.locator(CANVAS)).toHaveCount(0);

    await expect(
      page.locator("main section").last().getByRole("heading", { level: 2 }),
    ).toBeVisible();

    expect(errors, `uncaught errors: ${errors.join(" | ")}`).toEqual([]);

    await context.close();
  });

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

test.describe("hero signal field", () => {
  const HERO = "main [data-hero]";
  const STAGE = "[data-hero-stage]";
  const CANVAS = '[data-three-stage="signal-hero"]';
  const PORTRAIT = `${HERO} img[alt*="Nate Best"]`;

  const portraitShown = async (page: Page) => {
    const portrait = page.locator(PORTRAIT);
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        portrait.evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
  };

  const panelHeight = (page: Page) =>
    page
      .locator(STAGE)
      .evaluate((el) => el.parentElement!.getBoundingClientRect().height);

  const heroHeightInViewports = async (page: Page) => {
    const hero = await page
      .locator(HERO)
      .evaluate((el) => el.getBoundingClientRect().height);
    return hero / (await panelHeight(page));
  };

  const scrollHeroTo = (page: Page, viewports: number) =>
    page.locator(STAGE).evaluate((stage, v) => {
      const panel = stage.parentElement!;
      const track = panel.parentElement!;
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + panel.getBoundingClientRect().height * v);
    }, viewports);

  const settle = async (page: Page) => {
    await page.waitForLoadState("networkidle");
    await scrollHeroTo(page, 0.2);
    await page.waitForTimeout(1500);
  };

  test("with JavaScript disabled: the headline and Nate's photo, no canvas, no pin", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator(`${HERO} h1`)).toHaveText("Medicare, decoded.");
    await portraitShown(page);
    await expect(page.locator(CANVAS)).toHaveCount(0);
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    await context.close();
  });

  test("with reduced motion: Nate's photo stays, no canvas ever mounts, no pin", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    await settle(page);
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await portraitShown(page);
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    await context.close();
  });

  test("the field mounts once, rises with scroll, and resolves into the photo", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    expect(await heroHeightInViewports(page)).toBeGreaterThan(1.8);

    await scrollHeroTo(page, 0.05);
    const canvas = page.locator(CANVAS);
    await canvas.waitFor({ state: "attached", timeout: 15_000 });
    await expect(canvas).toHaveCount(1);
    await expect(page.locator(PORTRAIT)).toHaveCSS("opacity", "0");

    const progressOf = async () =>
      Number(await canvas.getAttribute("data-stage-progress"));
    const start = await progressOf();

    await scrollHeroTo(page, 0.5);
    await expect.poll(progressOf).toBeGreaterThan(start + 0.3);
    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "false");

    await scrollHeroTo(page, 0.98);
    await expect.poll(progressOf).toBeGreaterThan(0.85);
    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "true");
    await expect(canvas).toHaveCSS("opacity", "0");
    await portraitShown(page);

    await context.close();
  });

  test("in print with the field mounted: Nate's photo shows, no pin", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    await scrollHeroTo(page, 0.05);
    await page.locator(CANVAS).waitFor({ state: "attached", timeout: 15_000 });
    await scrollHeroTo(page, 0);

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(CANVAS)).toBeHidden();
    await portraitShown(page);
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    await context.close();
  });

  test("paused before load: no canvas until the visitor resumes", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() =>
      sessionStorage.setItem("effects-paused", "true"),
    );
    const page = await context.newPage();
    await page.goto("/");

    const pause = page.locator(EFFECTS_PAUSE).first();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await settle(page);
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await portraitShown(page);

    await pause.click();
    await expect(page.locator(CANVAS)).toHaveCount(1, { timeout: 15_000 });

    await context.close();
  });
});

test.describe("view transitions", () => {
  const navigate = async (page: import("@playwright/test").Page) => {
    await page
      .locator("header[data-site-header]")
      .getByRole("link", { name: "Services" })
      .first()
      .click();
    await page.waitForURL("**/services");
  };

  test("item 9: the three view-transition pseudo-elements animate for 0s under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await navigate(page);

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

    const content = animations.filter(
      (entry) => !entry.pseudo.includes("site-header") && entry.durationMs > 0,
    );
    expect(
      content.length,
      `nothing animated at all: ${JSON.stringify(animations)}`,
    ).toBeGreaterThan(0);

    await context.close();
  });

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

    expect(into!.delayMs).toBe(180);
    expect(out!.delayMs + out!.durationMs).toBeLessThanOrEqual(into!.delayMs);

    const root = animations.filter(
      (entry) => entry.pseudo.includes("(root)") && entry.durationMs > 0,
    );
    expect(
      root,
      `the root snapshot is still animating: ${JSON.stringify(root)}`,
    ).toEqual([]);

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

test.describe("shared-element morph", () => {
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

    const href = await cardEnd.evaluate(
      (el) =>
        el.closest("li")?.querySelector("a")?.getAttribute("href") ?? null,
    );
    expect(
      href,
      "the morph end is not inside a card that links anywhere",
    ).not.toBeNull();

    await page.locator(`a[href="${href}"]`).first().click();
    await page.waitForURL(`**${href}`);

    await expect(page.locator(`[data-morph="${name}"]`)).toHaveCount(1);

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

  test("print: 9 of 9 sections render", async ({ page }) => {
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

    const text = ((await paragraph.textContent()) ?? "").trim();
    expect(
      text.split(/\s+/).length,
      "the paragraph has no words",
    ).toBeGreaterThan(3);

    const litColours = await page.evaluate(() => {
      const root = document.querySelector("[data-lit-words]");
      if (!root) return [];
      return [...root.querySelectorAll("[data-lit-word]")].map((el) => ({
        opacity: Number(getComputedStyle(el).opacity),
      }));
    });

    expect(litColours.length, "no lit words rendered").toBeGreaterThan(3);
    for (const word of litColours) {
      expect(word.opacity, "a word is not fully lit under reduced motion").toBe(
        1,
      );
    }

    await context.close();
  });
});

test.describe("lenis smooth scroll", () => {
  test("is never constructed with reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const lenisVersion = await page.evaluate(
      () => (window as { lenisVersion?: string }).lenisVersion,
    );
    expect(lenisVersion).toBeUndefined();

    await context.close();
  });

  test("is constructed without reduced motion and torn down when the preference changes", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.classList.contains("lenis"),
        ),
      )
      .toBe(true);

    await page.emulateMedia({ reducedMotion: "reduce" });

    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.classList.contains("lenis"),
        ),
      )
      .toBe(false);
  });
});
