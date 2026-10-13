import { expect, type Page, test } from "@playwright/test";
import {
  builtCss,
  lastTransitionAnimations,
  recordViewTransitions,
  transitionCount,
} from "./support/browser";
import {
  brightestBackground,
  contrast,
  darkestBackground,
  HIDE_CHROME,
} from "./support/contrast";

import { testimonials as authoredTestimonials } from "../src/content/testimonials";

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

test.describe("night close", () => {
  const CLOSE = "main [data-night-close]";
  const PHONE = `${CLOSE} a[href^="tel:"]`;
  const STARS = `${CLOSE} [data-close-stars]`;
  const STAGE = '[data-three-stage="signal-close"]';
  const ANY_STAGE = "canvas[data-three-stage]";

  const withMotion = async (browser: import("@playwright/test").Browser) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    return { context, page };
  };

  const toClose = async (page: Page) => {
    const centre = () =>
      page.locator(CLOSE).evaluate((el) =>
        el.scrollIntoView({
          block: "center",
          behavior: "instant" as ScrollBehavior,
        }),
      );
    await centre();
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await centre();
  };

  const staticStars = async (page: Page) => {
    await expect(page.locator(STARS)).toBeVisible();
    await expect(page.locator(`${STARS} circle`)).toHaveCount(40);
  };

  test("the phone number is set at headline size in gold, with a full tap target", async ({
    page,
  }) => {
    await page.goto("/");
    await toClose(page);

    const phone = page.locator(PHONE);
    await expect(phone).toBeVisible();
    const size = await phone.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(size).toBeGreaterThanOrEqual(48);
    await expect(phone).toHaveCSS("color", "rgb(255, 192, 0)");
    await expect(page.locator(CLOSE)).toHaveAttribute("data-scheme", "black");

    const box = await phone.boundingBox();
    expect(box, "the phone link has no box").not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("the phone link shows a focus ring when reached by keyboard", async ({
    page,
  }) => {
    await page.goto("/");
    const phone = page.locator(PHONE);
    await phone.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(phone).toBeFocused();
    const outline = await phone.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  });

  test("with reduced motion: static stars and the phone, zero canvas", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await toClose(page);
    await page.waitForTimeout(1000);

    await expect(page.locator("canvas")).toHaveCount(0);
    await staticStars(page);
    await expect(page.locator(PHONE)).toBeVisible();

    await context.close();
  });

  test("with JavaScript disabled: static stars and the phone, zero canvas", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator("canvas")).toHaveCount(0);
    await staticStars(page);
    await expect(page.locator(PHONE)).toBeVisible();

    await context.close();
  });

  test("without WebGL: the static stars stay", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: unknown[]
      ) {
        if (String(args[0]).startsWith("webgl")) return null;
        return (
          original as unknown as (
            this: HTMLCanvasElement,
            ...rest: unknown[]
          ) => unknown
        ).apply(this, args);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const page = await context.newPage();
    await page.goto("/");
    await toClose(page);
    await page.waitForTimeout(1500);

    await expect(page.locator(STAGE)).toHaveCount(0);
    await staticStars(page);

    await context.close();
  });

  test("the star field mounts and replaces the static stars", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await toClose(page);

    await expect(page.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(ANY_STAGE)).toHaveCount(1);
    await expect(page.locator(STARS)).toBeHidden();
    await expect(page.locator(PHONE)).toBeVisible();

    await context.close();
  });

  test("scrolling the whole page never shows two stages at once", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await context.addInitScript(() => {
      const w = window as unknown as { maxStages: number; seen: string[] };
      w.maxStages = 0;
      w.seen = [];
      const sample = () => {
        const stages = document.querySelectorAll<HTMLCanvasElement>("canvas");
        w.maxStages = Math.max(w.maxStages, stages.length);
        for (const stage of stages) {
          const key = stage.dataset.threeStage ?? "";
          if (!w.seen.includes(key)) w.seen.push(key);
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto("/");
    await expect(page.locator('[data-three-stage="signal-hero"]')).toHaveCount(
      1,
      { timeout: 15_000 },
    );

    const { height, viewport } = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
    }));
    const stops: number[] = [];
    for (let y = 0; y <= height - viewport; y += viewport / 2) stops.push(y);
    stops.push(height - viewport);
    for (const y of [...stops, ...[...stops].reverse()]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(80);
    }

    const record = await page.evaluate(() => {
      const w = window as unknown as { maxStages: number; seen: string[] };
      return { maxStages: w.maxStages, seen: [...w.seen].sort() };
    });
    expect(record.maxStages).toBeLessThanOrEqual(1);
    if (!testInfo.project.use.isMobile) {
      expect(record.seen).toEqual(["glass", "signal-close", "signal-hero"]);
    } else {
      expect(record.seen).not.toContain("glass");
    }

    await context.close();
  });

  test("paused while live: the close canvas goes and the static stars return", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await toClose(page);
    await expect(page.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });

    await page.locator(EFFECTS_PAUSE).first().click();
    await expect(page.locator(EFFECTS_PAUSE).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await expect(page.locator(STAGE)).toHaveCount(0);
    await staticStars(page);

    await context.close();
  });

  test("in print with the field mounted: no stars, the phone prints", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await toClose(page);
    await expect(page.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(STARS)).toBeHidden();
    await expect(page.locator(PHONE)).toBeVisible();

    await context.close();
  });

  const hideCopy = (page: Page) =>
    page.addStyleTag({
      content: `${CLOSE} h2, ${CLOSE} p, ${CLOSE} a { visibility: hidden !important; }`,
    });

  for (const [label, reducedMotion] of [
    ["the live star field", "no-preference"],
    ["the static stars", "reduce"],
  ] as const) {
    test(`text over ${label} keeps AA contrast in every sampled frame`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ reducedMotion });
      const page = await context.newPage();
      await page.goto("/");
      await toClose(page);
      if (reducedMotion === "no-preference") {
        await expect(page.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });
      } else {
        await expect(page.locator(STARS)).toBeVisible();
      }
      await hideCopy(page);

      const copy = { heading: 0, body: 0, phone: 0 };
      for (let frame = 0; frame < 3; frame += 1) {
        await page.waitForTimeout(400);
        copy.heading = Math.max(
          copy.heading,
          await brightestBackground(page, `${CLOSE} h2`),
        );
        copy.body = Math.max(
          copy.body,
          await brightestBackground(page, `${CLOSE} p`),
        );
        copy.phone = Math.max(
          copy.phone,
          await brightestBackground(page, PHONE),
        );
      }

      expect(contrast("#A0A8C0", copy.heading)).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#A0A8C0", copy.body)).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#FFC000", copy.phone)).toBeGreaterThanOrEqual(3);

      await context.close();
    });
  }

  test("the live star field moves", async ({ browser }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await toClose(page);
    const stage = page.locator(STAGE);
    await expect(stage).toHaveCount(1, { timeout: 15_000 });
    await hideCopy(page);
    await page.waitForTimeout(300);

    const before = await stage.screenshot();
    await page.waitForTimeout(500);
    const after = await stage.screenshot();
    expect(after.equals(before), "two frames 500ms apart are identical").toBe(
      false,
    );

    await context.close();
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

test.describe("hero signal field", () => {
  const HERO = "main [data-hero]";
  const STAGE = "[data-hero-stage]";
  const CANVAS = '[data-three-stage="signal-hero"]';
  const PORTRAIT = `${HERO} img[src*="hero-maze"]`;
  const RUN = `${HERO} video[data-hero-run]`;

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

  const heroHeightInViewports = (page: Page) =>
    page
      .locator(HERO)
      .evaluate((el) => el.getBoundingClientRect().height / window.innerHeight);

  const withMotion = async (browser: import("@playwright/test").Browser) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    return { context, page: await context.newPage() };
  };

  test("with JavaScript disabled: the headline and the gold maze, no canvas, one screen tall", async ({
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

  test("with reduced motion: the gold maze stays, no canvas or light-run video ever mounts, one screen tall", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(RUN)).toHaveCount(0);
    await portraitShown(page);
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    await context.close();
  });

  test("on load, without scrolling, the field converges into the gold maze, the light runs to the centre once and holds", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    const canvas = page.locator(CANVAS);
    await canvas.waitFor({ state: "attached", timeout: 15_000 });
    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "false");
    await expect(page.locator(PORTRAIT)).toHaveCSS("opacity", "0");
    await expect(page.locator(RUN)).toHaveCount(0);

    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "true", {
      timeout: 6000,
    });
    const run = page.locator(RUN);
    await expect(run).toHaveCount(1);
    await expect(run).toHaveJSProperty("muted", true);
    await expect(run).toHaveJSProperty("loop", false);
    await expect
      .poll(
        () => run.evaluate((video: HTMLVideoElement) => video.currentTime),
        {
          timeout: 10_000,
        },
      )
      .toBeGreaterThan(0.2);
    await expect
      .poll(() => run.evaluate((video: HTMLVideoElement) => video.ended), {
        timeout: 15_000,
      })
      .toBe(true);
    const held = await run.evaluate(
      (video: HTMLVideoElement) => video.currentTime,
    );
    await page.waitForTimeout(1000);
    expect(
      await run.evaluate((video: HTMLVideoElement) => video.currentTime),
      "the light run holds its last frame instead of restarting",
    ).toBe(held);
    await expect(run).toBeVisible();
    await expect(page.locator(PORTRAIT)).toHaveCSS("opacity", "0");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const before = await canvas.screenshot();
    await page.waitForTimeout(600);
    expect(
      before.equals(await canvas.screenshot()),
      "the dust halo keeps moving after the reveal",
    ).toBe(false);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(canvas).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(canvas).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "true");
    await expect(
      run,
      "returning to the hero keeps the finished run on screen",
    ).toBeVisible();
    expect(
      await run.evaluate((video: HTMLVideoElement) => video.ended),
      "returning to the hero never replays the run",
    ).toBe(true);

    await context.close();
  });

  test("in print with the field mounted: the maze still shows and the light-run video hides, one page tall", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await page.locator(CANVAS).waitFor({ state: "attached", timeout: 15_000 });

    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "true", {
      timeout: 6000,
    });
    await expect(page.locator(RUN)).toHaveCount(1);

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(CANVAS)).toBeHidden();
    await expect(page.locator(RUN)).toBeHidden();
    await portraitShown(page);
    expect(await heroHeightInViewports(page)).toBeLessThan(1.2);

    await context.close();
  });

  test("paused before load: no canvas until the visitor resumes", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await context.addInitScript(() =>
      sessionStorage.setItem("effects-paused", "true"),
    );
    await page.goto("/");

    const pause = page.locator(EFFECTS_PAUSE).first();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await expect(page.locator(CANVAS)).toHaveCount(0);
    await portraitShown(page);

    await pause.click();
    await expect(page.locator(CANVAS)).toHaveCount(1, { timeout: 15_000 });

    await context.close();
  });

  test("paused while live: the hero canvas and light-run video go and the still maze returns", async ({
    browser,
  }) => {
    const { context, page } = await withMotion(browser);
    await page.goto("/");
    await expect(page.locator(CANVAS)).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(PORTRAIT)).toHaveCSS("opacity", "0");

    await page.locator(EFFECTS_PAUSE).first().click();

    await expect(page.locator(CANVAS)).toHaveCount(0);
    await expect(page.locator(STAGE)).toHaveAttribute("data-resolved", "false");
    await expect(page.locator(RUN)).toHaveCount(0);
    await expect(page.locator(EFFECTS_PAUSE).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await portraitShown(page);

    await context.close();
  });

  test("the largest contentful paint is hero copy or the maze", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const lcp = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as (PerformanceEntry & {
              element: Element | null;
            })[];
            const element = entries.at(-1)?.element;
            resolve(
              element
                ? `${element.tagName}|${element.closest("[data-hero]") ? "hero" : "elsewhere"}`
                : "none",
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );

    expect(["H1|hero", "P|hero", "IMG|hero"]).toContain(lcp);
  });

  test("on a phone, the call to action sits above the fold under the announcement bar", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "a phone-only fold check");
    const { site } = await import("../src/content/site");
    const { announcementIsLive } = await import("../src/lib/announcement");
    test.skip(
      !announcementIsLive(site.announcement),
      "the announcement window is closed",
    );

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Dismiss announcement" }),
    ).toBeVisible();

    const cta = page
      .locator(HERO)
      .getByRole("link", { name: "Talk to a licensed agent" });
    await expect(cta).toBeVisible();
    const fold = await cta.evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
      height: document.documentElement.clientHeight,
    }));
    expect(fold.top).toBeGreaterThanOrEqual(0);
    expect(fold.bottom).toBeLessThanOrEqual(fold.height);
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

    await navigate(page, "Contact", "contact");
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

  const irisRun = async (
    page: import("@playwright/test").Page,
    act: () => Promise<void>,
  ) => {
    await page.evaluate(() => {
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (options) => {
        const transition = original(options);
        void transition.ready.then(() => {
          (window as unknown as { __iris: unknown }).__iris = document
            .getAnimations()
            .map((animation) => {
              const effect = animation.effect as KeyframeEffect;
              return {
                name: (animation as CSSAnimation).animationName,
                pseudo: effect.pseudoElement ?? "",
                duration: effect.getComputedTiming().duration,
                clip: effect.getKeyframes().map((frame) => frame.clipPath),
              };
            });
        });
        return transition;
      };
    });
    await act();
    await page.waitForFunction(
      () => (window as unknown as { __iris?: unknown }).__iris !== undefined,
    );
    return page.evaluate(
      () =>
        (
          window as unknown as {
            __iris: {
              name: string;
              duration: number;
              clip: (string | number | null | undefined)[];
            }[];
          }
        ).__iris,
    );
  };

  const freshHome = async (browser: import("@playwright/test").Browser) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    return { context, page };
  };

  test("the iris opens from the click point over 450ms", async ({
    browser,
  }) => {
    const { context, page } = await freshHome(browser);
    const link = page
      .locator("header[data-site-header]")
      .getByRole("link", { name: "Services", exact: true })
      .first();
    const box = (await link.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    const run = await irisRun(page, () => link.click());
    const iris = run.find((entry) => entry.name === "page-iris");
    expect(iris, JSON.stringify(run)).toBeDefined();
    expect(iris!.duration).toBe(450);
    const first = String(iris!.clip[0]);
    const match = /circle\(0px at ([\d.]+)px ([\d.]+)px\)/.exec(first);
    expect(match, first).not.toBeNull();
    expect(Math.abs(Number(match![1]) - x)).toBeLessThan(2);
    expect(Math.abs(Number(match![2]) - y)).toBeLessThan(2);

    await context.close();
  });

  test("keyboard activation opens the iris from the viewport centre", async ({
    browser,
  }) => {
    const { context, page } = await freshHome(browser);
    const link = page
      .locator("header[data-site-header]")
      .getByRole("link", { name: "Services", exact: true })
      .first();
    await link.focus();

    const run = await irisRun(page, () => page.keyboard.press("Enter"));
    const iris = run.find((entry) => entry.name === "page-iris");
    expect(iris, JSON.stringify(run)).toBeDefined();
    expect(String(iris!.clip[0])).toContain("circle(0px at 640px 450px)");

    await context.close();
  });

  test("a fade-only destination records no clip-path keyframes", async ({
    browser,
  }) => {
    const { context, page } = await freshHome(browser);
    const link = page
      .locator("header[data-site-header]")
      .getByRole("link", { name: "Contact", exact: true })
      .first();

    const run = await irisRun(page, () => link.click());
    expect(run.some((entry) => entry.name === "page-iris")).toBe(false);
    expect(run.flatMap((entry) => entry.clip).filter((clip) => clip)).toEqual(
      [],
    );

    await context.close();
  });

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

  test("the iris stays at zero duration under reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await recordViewTransitions(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await navigate(page);
    const animations = await lastTransitionAnimations(page);
    expect(animations.filter((entry) => entry.durationMs > 0)).toEqual([]);

    await context.close();
  });

  test("the iris never adds a second canvas across forward and back", async ({
    browser,
  }) => {
    const { context, page } = await freshHome(browser);
    const canvases = () => page.locator("canvas").count();
    expect(await canvases()).toBeLessThanOrEqual(1);
    await navigate(page);
    expect(await canvases()).toBeLessThanOrEqual(1);
    await page.goBack();
    await page.waitForURL("**/");
    expect(await canvases()).toBeLessThanOrEqual(1);

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

test.describe("the signal reveal", () => {
  const PHOTO = "[data-signal-photo]";

  const photoState = (page: Page) =>
    page.locator(PHOTO).evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        clipPath: style.clipPath,
        filter: style.filter,
        transform: style.transform,
        opacity: style.opacity,
      };
    });

  const STILL = {
    clipPath: "none",
    filter: "none",
    transform: "none",
    opacity: "1",
  };

  const irisRadius = (clipPath: string) =>
    Number(/circle\(([\d.]+)%/.exec(clipPath)?.[1] ?? NaN);

  test("reduced motion, JS off and print show the whole colour photo, unclipped", async ({
    browser,
  }) => {
    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto("/");
    await reducedPage.locator(PHOTO).scrollIntoViewIfNeeded();
    expect(await photoState(reducedPage)).toEqual(STILL);
    await expect(reducedPage.locator("[data-signal] canvas")).toHaveCount(0);
    await reduced.close();

    const noJs = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: "no-preference",
    });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto("/");
    expect(await photoState(noJsPage)).toEqual(STILL);
    await noJsPage.emulateMedia({ media: "print" });
    expect(await photoState(noJsPage)).toEqual(STILL);
    await expect(noJsPage.locator("[data-signal] canvas")).toHaveCount(0);
    await noJs.close();

    const printed = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const printedPage = await printed.newPage();
    await printedPage.goto("/");
    await printedPage.locator(PHOTO).scrollIntoViewIfNeeded();
    await printedPage.emulateMedia({ media: "print" });
    expect(await photoState(printedPage)).toEqual(STILL);
    await printed.close();
  });

  test("Pause removes the reveal and leaves the whole colour photo visible", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("[data-effects-pause]").first().click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-effects-paused",
      "",
    );
    await page.locator(PHOTO).scrollIntoViewIfNeeded();
    expect(await photoState(page)).toEqual(STILL);
    await context.close();
  });

  test("with motion an iris opens on the photo as the band scrolls in, ending in full colour", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");
    const { top, bottom } = await page
      .locator("[data-signal-frame]")
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        return {
          top: box.top + window.scrollY,
          bottom: box.bottom + window.scrollY,
        };
      });

    await page.evaluate((y) => window.scrollTo(0, y), top - 900 * 0.6);
    await expect
      .poll(async () => irisRadius((await photoState(page)).clipPath))
      .toBeGreaterThan(14);
    const entering = await photoState(page);
    expect(irisRadius(entering.clipPath)).toBeLessThan(60);
    expect(entering.transform).not.toBe("none");
    expect(entering.filter).toContain("saturate");

    await page.evaluate((y) => window.scrollTo(0, y), bottom - 900 * 0.85);
    await expect
      .poll(async () => (await photoState(page)).clipPath)
      .toBe("circle(100% at 48% 35%)");
    expect((await photoState(page)).filter).toBe("saturate(1) brightness(1)");
    await context.close();
  });
});

test.describe("services glass", () => {
  const RAIL = 'section[aria-labelledby="services-heading"] ul[data-rail]';
  const STAGE = 'canvas[data-three-stage="glass"]';
  const ORBS = `${RAIL} [data-card-still]`;

  const toRail = async (page: Page) => {
    await page.locator(RAIL).evaluate((el) =>
      el.scrollIntoView({
        block: "center",
        behavior: "instant" as ScrollBehavior,
      }),
    );
  };

  const orbsShow = async (page: Page) => {
    await expect(page.locator(ORBS)).toHaveCount(3);
    for (const orb of await page.locator(ORBS).all()) {
      await expect(orb).toBeVisible();
    }
  };

  test("on a desktop the glass canvas mounts once the rail is in view", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    await toRail(page);

    await expect(page.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator("canvas[data-three-stage]")).toHaveCount(1);
    await expect(page.locator(STAGE)).toHaveAttribute("aria-hidden", "true");

    await context.close();
  });

  test("on a touch phone at 390 no glass canvas is created and the orbs show", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    await toRail(page);
    await page.waitForTimeout(1500);

    await expect(page.locator(STAGE)).toHaveCount(0);
    await orbsShow(page);

    await context.close();
  });

  test("when the studio map fails the canvas never mounts and the orbs stay", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/env/studio-cool-gold.jpg", (route) => route.abort());
    await page.goto("/");
    await toRail(page);
    await page.waitForTimeout(2000);

    await expect(page.locator(STAGE)).toHaveCount(0);
    await orbsShow(page);
    expect(
      errors.filter((message) => !message.startsWith("glass: the studio map")),
    ).toEqual([]);

    await context.close();
  });

  test("reduced motion, JavaScript off and print: orbs and zero canvas", async ({
    browser,
  }) => {
    const reduced = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      reducedMotion: "reduce",
    });
    const page = await reduced.newPage();
    await page.goto("/");
    await toRail(page);
    await page.waitForTimeout(1000);
    await expect(page.locator("canvas")).toHaveCount(0);
    await orbsShow(page);
    await reduced.close();

    const noScript = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      javaScriptEnabled: false,
    });
    const still = await noScript.newPage();
    await still.goto("/");
    await expect(still.locator("canvas")).toHaveCount(0);
    await orbsShow(still);
    await noScript.close();

    const printed = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      reducedMotion: "no-preference",
    });
    const print = await printed.newPage();
    await print.goto("/");
    await toRail(print);
    await expect(print.locator(STAGE)).toHaveCount(1, { timeout: 15_000 });
    await print.emulateMedia({ media: "print" });
    await expect(print.locator(STAGE)).toBeHidden();
    await orbsShow(print);
    await printed.close();
  });
});

test.describe("minnesota dawn to dusk", () => {
  const TRACK = "[data-lake-track]";
  const SCRUB = `${TRACK} video[data-lake-scrub]`;
  const STILL = `${TRACK} img[data-lake-still]`;
  const VIDEO = `${TRACK} video`;
  const DESKTOP = { width: 1440, height: 900 };
  const PHONE = { width: 390, height: 844 };

  const open = async (
    browser: import("@playwright/test").Browser,
    viewport: { width: number; height: number },
    options: { reducedMotion?: "reduce" | "no-preference"; js?: boolean } = {},
  ) => {
    const context = await browser.newContext({
      viewport,
      reducedMotion: options.reducedMotion ?? "no-preference",
      javaScriptEnabled: options.js ?? true,
      ...(viewport.width < 700 ? { hasTouch: true, isMobile: true } : {}),
    });
    const page = await context.newPage();
    await page.goto("/");
    return { context, page };
  };

  const toProgress = (page: Page, progress: number) =>
    page.locator(TRACK).evaluate((el, p) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.getBoundingClientRect().height - window.innerHeight;
      window.scrollTo({ top: top + travel * p, behavior: "instant" });
    }, progress);

  const scrubFraction = (page: Page) =>
    page
      .locator(SCRUB)
      .evaluate(
        (el) =>
          (el as HTMLVideoElement).currentTime /
          (el as HTMLVideoElement).duration,
      );

  const settleAt = async (page: Page, progress: number) => {
    await toProgress(page, progress);
    await expect
      .poll(async () => Math.abs((await scrubFraction(page)) - progress), {
        timeout: 10_000,
      })
      .toBeLessThanOrEqual(0.03);
  };

  const hideCopy = (page: Page) =>
    page.addStyleTag({
      content: `${HIDE_CHROME} ${TRACK} h2, ${TRACK} p { visibility: hidden !important; }`,
    });

  test("reduced motion and JavaScript off show the poster still and zero canvas", async ({
    browser,
  }) => {
    for (const options of [
      { reducedMotion: "reduce" as const },
      { js: false },
    ]) {
      const { context, page } = await open(browser, DESKTOP, options);
      await toProgress(page, 0.5);
      await page.waitForTimeout(1000);
      await expect(page.locator(STILL)).toBeVisible();
      await expect(page.locator(`${TRACK} h2`)).toBeVisible();
      await expect(page.locator(`${TRACK} p`)).toBeVisible();
      await expect(page.locator(`${TRACK} canvas`)).toHaveCount(0);
      await expect(page.locator(VIDEO)).toHaveCount(0);
      await context.close();
    }
  });

  test("on a desktop scroll scrubs the lake video from night to dusk", async ({
    browser,
  }) => {
    const { context, page } = await open(browser, DESKTOP);
    await toProgress(page, 0.1);
    await expect(page.locator(SCRUB)).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(SCRUB)).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(SCRUB)).toHaveAttribute("preload", "metadata");
    await expect(page.locator(`${TRACK} canvas`)).toHaveCount(0);

    await settleAt(page, 0.1);
    const early = await scrubFraction(page);
    await settleAt(page, 0.9);
    const late = await scrubFraction(page);
    expect(late).toBeGreaterThan(early);

    await context.close();
  });

  test("at 390 the loop plays instead of the scrub", async ({ browser }) => {
    const { context, page } = await open(browser, PHONE);
    await toProgress(page, 0.2);
    await page.waitForTimeout(1500);

    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator(VIDEO)).toHaveCount(1);
    const video = page.locator(VIDEO);
    expect(await video.evaluate((el) => (el as HTMLVideoElement).muted)).toBe(
      true,
    );
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("poster", /lake-dusk/);
    await expect(video).toHaveAttribute("preload", "none");

    await context.close();
  });

  test("under reduced motion no video at either width", async ({ browser }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      const { context, page } = await open(browser, viewport, {
        reducedMotion: "reduce",
      });
      await toProgress(page, 0.2);
      await page.waitForTimeout(1000);
      await expect(page.locator("video")).toHaveCount(0);
      await expect(page.locator(STILL)).toBeVisible();
      await context.close();
    }
  });

  test("pressing Pause pauses the loop and the still shows", async ({
    browser,
  }) => {
    const { context, page } = await open(browser, PHONE);
    await toProgress(page, 0.2);
    const video = page.locator(VIDEO);
    await expect
      .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused), {
        timeout: 15_000,
      })
      .toBe(false);

    await page.locator(EFFECTS_PAUSE).first().click();

    await expect
      .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused))
      .toBe(true);
    await expect(video).toBeHidden();
    await expect(page.locator(STILL)).toBeVisible();

    await context.close();
  });

  test("white copy keeps AA over the brightest frame of the desktop scrub", async ({
    browser,
  }) => {
    const { context, page } = await open(browser, DESKTOP);
    await toProgress(page, 0);
    await expect(page.locator(SCRUB)).toHaveCount(1, { timeout: 15_000 });
    await hideCopy(page);

    const worst = { heading: 0, body: 0 };
    for (const progress of [0, 0.2, 0.35, 0.45, 0.5, 0.55, 0.65, 0.8, 1]) {
      await settleAt(page, progress);
      await page.waitForTimeout(200);
      worst.heading = Math.max(
        worst.heading,
        await brightestBackground(page, `${TRACK} h2`),
      );
      worst.body = Math.max(
        worst.body,
        await brightestBackground(page, `${TRACK} p`),
      );
    }

    expect(contrast("#FFFFFF", worst.heading)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", worst.body)).toBeGreaterThanOrEqual(4.5);

    await context.close();
  });

  test("white copy keeps AA over the brightest frame of the phone loop", async ({
    browser,
  }) => {
    const { context, page } = await open(browser, PHONE);
    await toProgress(page, 0.2);
    const video = page.locator(VIDEO);
    await expect(video).toHaveCount(1);
    await hideCopy(page);

    const worst = { heading: 0, body: 0 };
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await video.evaluate(async (el, f) => {
        const v = el as HTMLVideoElement;
        v.pause();
        if (Number.isNaN(v.duration)) {
          v.load();
          await new Promise((r) =>
            v.addEventListener("loadedmetadata", r, { once: true }),
          );
        }
        const seeked = new Promise((r) =>
          v.addEventListener("seeked", r, { once: true }),
        );
        v.currentTime = Math.min(f * v.duration, v.duration - 0.05);
        await seeked;
      }, fraction);
      await page.waitForTimeout(150);
      worst.heading = Math.max(
        worst.heading,
        await brightestBackground(page, `${TRACK} h2`),
      );
      worst.body = Math.max(
        worst.body,
        await brightestBackground(page, `${TRACK} p`),
      );
    }

    expect(contrast("#FFFFFF", worst.heading)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", worst.body)).toBeGreaterThanOrEqual(4.5);

    await context.close();
  });
});

test.describe("testimonial stack", () => {
  const BAND = 'section[aria-labelledby="testimonials-heading"]';
  const ITEMS = `${BAND} [data-quote-stack] > li`;

  const transforms = (page: Page) =>
    page.locator(ITEMS).evaluateAll((items) =>
      items.map((item) => ({
        active: item.getAttribute("data-active-quote") === "true",
        transform: getComputedStyle(item).transform,
      })),
    );

  const quoteOpacities = (page: Page) =>
    page
      .locator(
        `${BAND} blockquote, ${BAND} blockquote span:not([data-lit-word])`,
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).opacity),
      );

  test("a sweep keeps at most one active quote, none dimmed, none hidden", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    const { top, height, viewport } = await page
      .locator(BAND)
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        return {
          top: box.top + scrollY,
          height: box.height,
          viewport: innerHeight,
        };
      });
    const steps = 14;
    for (let step = 0; step <= steps; step++) {
      await page.evaluate(
        (y) => window.scrollTo(0, y),
        top - viewport + ((height + viewport) * step) / steps,
      );
      await page.waitForTimeout(120);
      const active = await page
        .locator(`${BAND} [data-active-quote="true"]`)
        .count();
      expect(active).toBeLessThanOrEqual(1);
      await expect(page.locator(`${BAND} blockquote`)).toHaveCount(
        authoredTestimonials.length,
      );
      await expect(
        page.locator(
          `${BAND} :is(ol, li, blockquote, blockquote *)[aria-hidden]:not([data-lit-word])`,
        ),
      ).toHaveCount(0);
    }
    await page
      .locator(BAND)
      .evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await page.waitForTimeout(200);
    await expect(
      page.locator(`${BAND} [data-active-quote="true"]`),
    ).toHaveCount(1);
    await context.close();
  });

  test("focus-pull is a transform only: the active quote has none, the rest scale to .97", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page
      .locator(BAND)
      .evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await page.waitForTimeout(700);
    for (const item of await transforms(page)) {
      if (item.active) expect(item.transform).toBe("none");
      else expect(item.transform).toMatch(/^matrix\(0\.97, 0, 0, 0\.97,/);
    }
    for (const opacity of await quoteOpacities(page)) expect(opacity).toBe("1");

    await page.locator("[data-effects-pause]").first().click();
    await page.waitForTimeout(700);
    for (const item of await transforms(page))
      expect(item.transform).toBe("none");
    await context.close();
  });

  test("reduced motion and print: no transform, no overlap, every quote visible", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media, reducedMotion: "reduce" });
      for (const item of await transforms(page))
        expect(item.transform).toBe("none");
      const boxes = await page
        .locator(ITEMS)
        .evaluateAll((items) =>
          items.map((item) => item.getBoundingClientRect()),
        );
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
      }
      for (const opacity of await quoteOpacities(page))
        expect(opacity).toBe("1");
    }
    await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
    for (const item of await transforms(page))
      expect(item.transform).toBe("none");
    await context.close();
  });

  test("the home page has two pinned stages, each at most three screens tall", async ({
    page,
  }) => {
    await page.goto("/");
    const stages = await page.evaluate(() =>
      [...document.querySelectorAll("[data-stage]")].map(
        (el) => el.getBoundingClientRect().height / innerHeight,
      ),
    );
    expect(stages.length).toBeLessThanOrEqual(2);
    for (const screens of stages) expect(screens).toBeLessThanOrEqual(3);
  });
});

test.describe("night close", () => {
  const CLOSE = "main [data-night-close]";

  test("has no portrait, so Nate's face never repeats; stars and the big number stay", async ({
    browser,
  }, testInfo) => {
    for (const options of [
      { reducedMotion: "no-preference" as const },
      { reducedMotion: "reduce" as const },
      { javaScriptEnabled: false },
    ]) {
      const context = await browser.newContext({
        ...testInfo.project.use,
        ...options,
      });
      const page = await context.newPage();
      await page.goto("/");
      const close = page.locator(CLOSE);
      await close.scrollIntoViewIfNeeded();
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        await expect(close.locator("img")).toHaveCount(0);
        await expect(close.locator('a[href^="tel:"]')).toBeVisible();
        await expect(
          page.locator('main img[src*="hero-maze"]'),
          "the gold maze appears once on the home page",
        ).toHaveCount(1);
        await expect(page.locator('main img[src*="nate-duotone"]')).toHaveCount(
          0,
        );
      }
      if (options.reducedMotion !== "no-preference") {
        await page.emulateMedia({ media: "screen" });
        await expect(close.locator("[data-close-stars]")).toBeVisible();
      }
      await context.close();
    }
  });
});

test.describe("film grain", () => {
  const grain = (page: Page) =>
    page.evaluate(() => {
      const style = getComputedStyle(document.body, "::after");
      return {
        content: style.content,
        display: style.display,
        pointerEvents: style.pointerEvents,
        blend: style.mixBlendMode,
        opacity: Number(style.opacity),
      };
    });

  test("is a tuned, inert overlay that print removes", async ({ page }) => {
    await page.goto("/privacy");
    const style = await grain(page);
    expect(style.content).not.toBe("none");
    expect(style.pointerEvents).toBe("none");
    expect(style.blend).toBe("overlay");
    expect(style.opacity).toBeGreaterThanOrEqual(0.08);
    expect(style.opacity).toBeLessThanOrEqual(0.12);
    await page.emulateMedia({ media: "print" });
    expect((await grain(page)).display).toBe("none");
  });

  test("keeps text contrast and a ground-black band under rgb(12, 12, 12)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/privacy");
    await page.addStyleTag({
      content: `${HIDE_CHROME} main p:first-of-type { visibility: hidden !important; }`,
    });
    const dark = await darkestBackground(page, "main p:first-of-type");
    expect(contrast("#0A1128", dark)).toBeGreaterThanOrEqual(4.5);

    await page.goto("/");
    await expect
      .poll(async () => {
        const before = await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          return document.documentElement.scrollHeight;
        });
        await page.waitForTimeout(200);
        return page.evaluate(
          (height) => document.documentElement.scrollHeight === height,
          before,
        );
      })
      .toBe(true);
    const close = page.locator("main [data-night-close]");
    await close.scrollIntoViewIfNeeded();
    await page.addStyleTag({ content: HIDE_CHROME });
    const shot = await close.screenshot({ scale: "css" });
    const mean = await page.evaluate(async (png) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, image.width, 64);
      const { data } = context.getImageData(0, 0, 64, 64);
      let total = 0;
      for (let i = 0; i < data.length; i += 4) total += data[i];
      return total / (data.length / 4);
    }, shot.toString("base64"));
    expect(mean).toBeLessThanOrEqual(12);
  });

  test("a link under the overlay stays clickable", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/contact"]:visible').first().click();
    await expect(page).toHaveURL(/\/contact/);
  });
});
