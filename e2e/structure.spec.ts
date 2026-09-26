import { expect, test } from "@playwright/test";
import { testimonials as authoredTestimonials } from "../src/content/testimonials";

/**
 * Page composition: the bands that were rebuilt, and what each renders from the
 * content modules.
 */

const DESKTOP = { width: 1440, height: 900 };

const SERVICE_BAND = 'section[aria-labelledby="services-heading"]';
const TESTIMONIAL_BAND = 'section[aria-labelledby="testimonials-heading"]';

// §9.2 item 23 — SC-10, FR-99.
test.describe("the service band", () => {
  test("item 23: renders alternating full-bleed rows and zero cards", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");

    const band = page.locator(SERVICE_BAND);
    await expect(band, "no service band on the home route").toHaveCount(1);

    // Scoped to this band, not the page: the learning band also emits
    // [data-card], so an unscoped count would never reach zero.
    await expect(band.locator("[data-card]")).toHaveCount(0);

    // Counted here so the zero above cannot pass by the attribute going missing.
    await expect(
      page.locator("[data-card]"),
      "no cards anywhere on the page: the marker is missing rather than the band being card-free",
    ).not.toHaveCount(0);

    const rows = await band.locator("ul > li").count();
    expect(rows, "the service band rendered no rows").toBeGreaterThan(1);

    // Alternation measured as geometry, not as class names. Which side the
    // photograph is on is the visible property; the utility that produces it
    // is an implementation detail that a refactor is free to change.
    const sides = await band.evaluate((el) =>
      [...el.querySelectorAll("ul > li")]
        .map((row) => {
          const image = row.querySelector("img");
          const heading = row.querySelector("h3");
          if (!image || !heading) return null;
          return image.getBoundingClientRect().left <
            heading.getBoundingClientRect().left
            ? "image-left"
            : "image-right";
        })
        .filter((side): side is "image-left" | "image-right" => side !== null),
    );

    // Rows with no photograph fall back to type and space and have no side to
    // alternate, which is correct rather than a gap — this site has no
    // photography of its own yet and the honest answer is the typographic row.
    // Alternation is asserted over the rows that do have one.
    for (let i = 1; i < sides.length; i += 1) {
      expect(
        sides[i],
        `rows ${i - 1} and ${i} put the photograph on the same side: ${sides.join(", ")}`,
      ).not.toBe(sides[i - 1]);
    }
  });
});

// §9.2 item 24 — SC-10, FR-101, FR-102.
test.describe("the testimonials band", () => {
  test("item 24: every quote is in the DOM, with no carousel and no auto-advance", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");

    const band = page.locator(TESTIMONIAL_BAND);
    await expect(band, "no testimonials band on the home route").toHaveCount(1);

    // The expected count comes from the authored module rather than from the
    // page, so "every quote renders" is a comparison against the authored set
    // and not a restatement of whatever happens to be on screen. A band that
    // renders three of six quotes satisfies every assertion that counts what
    // it can see.
    expect(
      authoredTestimonials.length,
      "no testimonials authored, so this proves nothing",
    ).toBeGreaterThan(0);

    await expect(band.locator("blockquote")).toHaveCount(
      authoredTestimonials.length,
    );

    // All of them visible, not merely present: a carousel implemented with
    // `display: none` would satisfy a DOM count and still hide content behind
    // an interaction a keyboard user has to discover.
    const hidden = await band.evaluate(
      (el) =>
        [...el.querySelectorAll("blockquote")].filter((quote) => {
          const style = getComputedStyle(quote);
          return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            quote.getBoundingClientRect().height === 0
          );
        }).length,
    );
    expect(hidden, "some quotes are in the DOM but not on the page").toBe(0);

    await expect(band.locator("button")).toHaveCount(0);
    await expect(
      band.locator('[role="tablist"], [aria-roledescription="carousel"]'),
    ).toHaveCount(0);

    // No auto-advance. Sampled rather than argued from the absence of
    // controls, because an auto-advancing band needs no controls at all — and
    // an auto-advancing band is the worse of the two, since it moves text out
    // from under somebody still reading it.
    const before = await band.locator("blockquote").allInnerTexts();
    await page.waitForTimeout(3000);
    expect(
      await band.locator("blockquote").allInnerTexts(),
      "the quotes changed on their own",
    ).toEqual(before);
  });
});

/**
 * The site is a static export: every route's copy is in the HTML before any
 * script runs, and no request touches a database.
 */
test.describe("authored content", () => {
  const ROUTES = [
    "/",
    "/services",
    "/services/part-d",
    "/team",
    "/team/owner",
    "/events",
    "/events/medicare-basics-workshop",
    "/learn",
    "/learn/when-can-i-change-my-plan",
    "/contact",
    "/disclosures",
    "/accessibility",
  ];

  for (const route of ROUTES) {
    test(`every route renders its authored content with no database — ${route}`, async ({
      page,
    }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} did not return 200`).toBe(200);

      // Any level: the three index routes lead with the band's `h2` rather
      // than an `h1`, which predates this work and which axe does not flag at
      // WCAG 2.2 AA. What this test is for is that the copy is there at all.
      const heading = page.locator("main h1, main h2").first();
      await expect(heading, `${route} has no heading`).toHaveCount(1);
      expect(
        ((await heading.textContent()) ?? "").trim().length,
        `${route} has an empty heading`,
      ).toBeGreaterThan(0);

      const body = (await page.locator("main").innerText()).trim();
      expect(body.length, `${route} rendered an empty main`).toBeGreaterThan(
        80,
      );
    });
  }

  test("pre-hydration: the served HTML carries every band's copy", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();

    // Copy authored in src/content/, checked in the raw bytes rather than in
    // the rendered page, so nothing here can have been produced by a script.
    for (const copy of [
      "Medicare decisions.",
      "How we help",
      "What clients say",
      "Learning Center",
      "We represent",
      "Common questions",
      "Not sure where to start?",
    ]) {
      expect(html, `"${copy}" is not in the served HTML`).toContain(copy);
    }

    // The reveal attribute is present in the markup, so the CSS escape hatches
    // have something to act on before hydration.
    expect(html).toContain("data-reveal");
  });

  test("the announcement bar honours its window", async ({ page, request }) => {
    const { site } = await import("../src/content/site");
    const { announcementIsLive } = await import("../src/lib/announcement");

    const liveAtBuild = announcementIsLive(site.announcement);
    const html = await (await request.get("/")).text();

    if (liveAtBuild) {
      expect(
        html,
        "the window is open but the bar is not in the served HTML",
      ).toContain(site.announcement.text!);
    } else {
      expect(
        html,
        "the window is closed but the bar was server-rendered",
      ).not.toContain(site.announcement.text!);
    }

    // And the client agrees with the server after hydration.
    await page.goto("/");
    const bar = page.getByText(site.announcement.text!, { exact: false });
    await expect(bar).toHaveCount(liveAtBuild ? 1 : 0);
  });
});
