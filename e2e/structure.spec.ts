import { expect, test } from "@playwright/test";
import { testimonials as authoredTestimonials } from "../src/content/testimonials";

const DESKTOP = { width: 1440, height: 900 };

const SERVICE_BAND = 'section[aria-labelledby="services-heading"]';
const TESTIMONIAL_BAND = 'section[aria-labelledby="testimonials-heading"]';

test("home: every band shows its heading after scrolling into view", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/");

  const bands = page.locator("[data-band]");
  const count = await bands.count();
  expect(count, "no bands on the home route").toBeGreaterThan(1);

  for (let i = 0; i < count; i += 1) {
    const band = bands.nth(i);
    const heading = band.locator("h1, h2, h3, dd").first();
    await band.scrollIntoViewIfNeeded();
    await heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await expect(heading, `band ${i} has no visible heading`).toBeVisible();
    const opacity = await heading.evaluate((el) => {
      let product = 1;
      for (let node: Element | null = el; node; node = node.parentElement) {
        product *= Number(getComputedStyle(node).opacity);
      }
      return product;
    });
    expect(opacity, `band ${i} heading opacity`).toBe(1);
  }
});

test.describe("the service band", () => {
  test("item 23: renders alternating full-bleed rows and zero cards", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");

    const band = page.locator(SERVICE_BAND);
    await expect(band, "no service band on the home route").toHaveCount(1);

    await expect(band.locator("[data-card]")).toHaveCount(0);

    await expect(
      page.locator("[data-card]"),
      "no cards anywhere on the page: the marker is missing rather than the band being card-free",
    ).not.toHaveCount(0);

    const rows = await band.locator("ul > li").count();
    expect(rows, "the service band rendered no rows").toBeGreaterThan(1);

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

    for (let i = 1; i < sides.length; i += 1) {
      expect(
        sides[i],
        `rows ${i - 1} and ${i} put the photograph on the same side: ${sides.join(", ")}`,
      ).not.toBe(sides[i - 1]);
    }
  });
});

test.describe("the testimonials band", () => {
  test("item 24: every quote is in the DOM, with no carousel and no auto-advance", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");

    const band = page.locator(TESTIMONIAL_BAND);
    await expect(band, "no testimonials band on the home route").toHaveCount(1);

    expect(
      authoredTestimonials.length,
      "no testimonials authored, so this proves nothing",
    ).toBeGreaterThan(0);

    await expect(band.locator("blockquote")).toHaveCount(
      authoredTestimonials.length,
    );

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

    const before = await band.locator("blockquote").allInnerTexts();
    await page.waitForTimeout(3000);
    expect(
      await band.locator("blockquote").allInnerTexts(),
      "the quotes changed on their own",
    ).toEqual(before);
  });
});

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

    for (const copy of [
      "Medicare, decoded.",
      "How we help",
      "What clients say",
      "Learning Center",
      "We represent",
      "Common questions",
      "Not sure where to start?",
    ]) {
      expect(html, `"${copy}" is not in the served HTML`).toContain(copy);
    }

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

    await page.goto("/");
    const bar = page.getByText(site.announcement.text!, { exact: false });
    await expect(bar).toHaveCount(liveAtBuild ? 1 : 0);
  });
});

test("team/owner: the portrait never renders wider than its 600 px source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto("/team/owner");

  const box = await page.locator("main img").first().boundingBox();
  expect(box, "no portrait on /team/owner").not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(600);
});

for (const path of ["/", "/contact"]) {
  test(`${path}: header and footer lockups carry the same real-text name`, async ({
    page,
  }) => {
    await page.goto(path);

    const header = page.locator("header [data-brand-lockup]");
    const footer = page.locator("footer [data-brand-lockup]");
    const name = (await header.innerText()).trim();

    expect(name, "header lockup has no text").not.toBe("");
    expect((await footer.innerText()).trim()).toBe(name);
    await expect(
      page.locator("header").getByRole("link", { name }),
    ).toHaveCount(1);
    await expect(header.locator("img")).toHaveCount(0);
    await expect(footer.locator("img")).toHaveCount(0);
  });
}
