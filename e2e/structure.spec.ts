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

    const markLeft = (await page
      .locator("header [data-brand-mark]")
      .boundingBox())!.x;
    const barLeft = (await page
      .locator("header [data-header-utility] [data-effects-pause]")
      .boundingBox())!.x;
    expect(Math.abs(markLeft - barLeft)).toBeLessThanOrEqual(1);
  });
}

const HEADER = "header[data-site-header]";
const HEADER_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
];
const HEADER_ROUTES = ["/", "/contact", "/privacy"];
const PHONE_NAME = /^Call \(\d{3}\) \d{3}-\d{4}$/;
const NAVY = "rgb(8, 26, 58)";

const scrollTo = async (page: import("@playwright/test").Page, y: number) => {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await expect(page.locator(HEADER)).toHaveAttribute("data-stuck", "");
};

const contrast = (fg: string, bg: string) => {
  const luminance = (colour: string) => {
    const [r, g, b] = (colour.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

test.describe("the header: one dark bar, Nate's chip and the gold phone", () => {
  for (const viewport of HEADER_VIEWPORTS) {
    test(`chip, phone and targets at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      for (const route of HEADER_ROUTES) {
        await page.goto(route);
        await expect(
          page.getByRole("dialog", { name: "Cookie choices" }),
          `${route}: the banner is not showing`,
        ).toBeVisible();
        const header = page.locator(HEADER);

        const chip = header.locator("img[data-portrait-chip]");
        await expect(chip, `${route}: no chip`).toBeVisible();
        const image = await chip.evaluate((el: HTMLImageElement) => ({
          natural: el.naturalWidth,
          src: el.currentSrc,
        }));
        expect(image.natural, route).toBe(192);
        expect(new URL(image.src).pathname, route).toMatch(
          /nate-chip-192\.webp$/,
        );
        const bytes = (await (await page.request.get(image.src)).body()).length;
        expect(bytes, `${route}: chip weighs ${bytes} B`).toBeLessThanOrEqual(
          8192,
        );

        const phone = header.locator('a[href^="tel:"]');
        await expect(phone, `${route}: header tel links`).toHaveCount(1);
        const box = (await phone.boundingBox())!;
        expect(box.width, route).toBeGreaterThanOrEqual(44);
        expect(box.height, route).toBeGreaterThanOrEqual(44);
        const name = (await phone.getAttribute("aria-label")) ?? "";
        expect(name, route).toMatch(PHONE_NAME);
        await expect(phone).toHaveAccessibleName(name);
        const visible = (await phone.innerText()).trim();
        expect(visible, route).toBe(
          viewport.width >= 640 ? name.replace(/^Call /, "") : "Call",
        );
        expect(name.replace(/\D/g, ""), route).toBe(
          (await phone.getAttribute("href"))!.replace(/\D/g, ""),
        );

        const targets = await header.evaluate((el) =>
          [...el.querySelectorAll("a, button")]
            .filter((node) => node.getClientRects().length > 0)
            .map((node) => {
              const rect = node.getBoundingClientRect();
              return {
                label: (
                  node.getAttribute("aria-label") ??
                  node.textContent ??
                  ""
                ).trim(),
                width: Math.round(rect.width * 10) / 10,
                height: Math.round(rect.height * 10) / 10,
              };
            }),
        );
        const bad = targets.filter(
          (t) => t.width < 44 || t.height < 44 || t.height > 56,
        );
        expect(bad, `${route}: ${JSON.stringify(bad)}`).toEqual([]);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${route}: horizontal scroll`).toBeLessThanOrEqual(0);
      }
    });

    test(`one dark scheme before and after scrolling at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      for (const route of HEADER_ROUTES) {
        await page.goto(route);
        const header = page.locator(HEADER);
        await expect(header).toHaveAttribute("data-scheme", "dark");

        await scrollTo(page, 400);
        await expect(header).toHaveAttribute("data-stuck", "");
        await expect(header).toHaveAttribute("data-scheme", "dark");
        await expect(header.locator(".bg-action")).toHaveCount(1);

        const stuck = await header.evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          background: getComputedStyle(el).backgroundColor,
        }));
        expect(stuck.height, route).toBeLessThanOrEqual(72);
        expect(stuck.background, route).toBe(NAVY);
      }
    });
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`the hero stage starts below the header at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const stageTop = (await page.locator("[data-hero-stage]").boundingBox())!
        .y;
      const headerBox = (await page.locator(HEADER).boundingBox())!;
      expect(stageTop).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    });

    test(`the stuck bar keeps a Pause toggle at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const header = page.locator(HEADER);
      const label = (
        await header
          .locator("[data-header-utility] [data-effects-pause]")
          .innerText()
      ).trim();
      expect(label).toBe("Pause animations");

      await scrollTo(page, viewport.height * 2);
      await expect(header.locator("[data-header-utility]")).toBeHidden();

      const toggle = header.locator("[data-effects-pause]");
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      const box = (await toggle.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await expect(toggle).toHaveAttribute("aria-label", label);
      await expect(toggle).toHaveAttribute("aria-pressed", "false");

      const html = page.locator("html");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(html).toHaveAttribute("data-effects-paused", "");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await expect(html).not.toHaveAttribute("data-effects-paused");
    });
  }

  test("the 390 px nav sheet carries the chip and a 44x44 phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page
      .locator(HEADER)
      .getByRole("button", { name: /menu/i })
      .first()
      .click();

    const sheet = page.locator("[data-nav-sheet]");
    await expect(sheet.locator("img[data-portrait-chip]")).toBeVisible();
    const box = (await sheet.locator('a[href^="tel:"]').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("the cookie strip", () => {
  for (const { width, height, max } of [
    { width: 1440, height: 900, max: 96 },
    { width: 390, height: 844, max: 160 },
  ]) {
    test(`a full-width strip that never covers the hero CTA at ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const strip = page.getByRole("dialog", { name: "Cookie choices" });
      await expect(strip).toBeVisible();
      const cta = page.locator("[data-hero] a[href]").first();
      await expect(cta).toBeVisible();

      const measured = await strip.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const text = el.querySelector("p")!;
        return {
          left: rect.left,
          width: rect.width,
          height: rect.height,
          innerWidth: window.innerWidth,
          colour: getComputedStyle(text).color,
          background: getComputedStyle(el).backgroundColor,
        };
      });
      expect(measured.left).toBe(0);
      expect(measured.width).toBe(measured.innerWidth);
      expect(measured.height).toBeLessThanOrEqual(max);
      expect(
        contrast(measured.colour, measured.background),
        `${measured.colour} on ${measured.background}`,
      ).toBeGreaterThanOrEqual(4.5);

      const stripBox = (await strip.boundingBox())!;
      const lifted = (await cta.boundingBox())!;
      const overlaps =
        lifted.x < stripBox.x + stripBox.width &&
        stripBox.x < lifted.x + lifted.width &&
        lifted.y < stripBox.y + stripBox.height &&
        stripBox.y < lifted.y + lifted.height;
      expect(
        overlaps,
        `CTA ${JSON.stringify(lifted)} strip ${JSON.stringify(stripBox)}`,
      ).toBe(false);

      await strip.getByRole("button", { name: "Accept" }).click();
      await expect(strip).toHaveCount(0);
      await expect(page.locator("html")).not.toHaveAttribute(
        "data-consent-open",
      );
      const settled = (await cta.boundingBox())!;
      expect(Math.abs(settled.y - lifted.y - stripBox.height)).toBeLessThan(
        1.5,
      );
    });
  }

  test("both buttons stay on screen and 44x44 at 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 225 });
    await page.goto("/");

    const strip = page.getByRole("dialog", { name: "Cookie choices" });
    for (const name of ["Reject", "Accept"]) {
      const box = (await strip.getByRole("button", { name }).boundingBox())!;
      expect(box.width, name).toBeGreaterThanOrEqual(44);
      expect(box.height, name).toBeGreaterThanOrEqual(44);
      expect(box.x, name).toBeGreaterThanOrEqual(0);
      expect(box.y, name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, name).toBeLessThanOrEqual(360);
      expect(box.y + box.height, name).toBeLessThanOrEqual(225);
    }
  });

  test("the strip does not print", async ({ page }) => {
    await page.goto("/");
    const strip = page.getByRole("dialog", { name: "Cookie choices" });
    await expect(strip).toBeVisible();
    await page.emulateMedia({ media: "print" });
    expect(
      await page
        .locator('[role="dialog"][aria-label="Cookie choices"]')
        .evaluate((el) => getComputedStyle(el).display),
    ).toBe("none");
  });
});
