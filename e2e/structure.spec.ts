import { expect, test } from "@playwright/test";

test.describe("authored content", () => {
  const ROUTES = [
    "/",
    "/services",
    "/services/part-d",
    "/team",
    "/team/owner",
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

test.describe("the team page is Nate", () => {
  test("/team: CMIP is spelled out in the heading, the credentials list and the tab title", async ({
    page,
  }) => {
    await page.goto("/team");
    expect(await page.title()).toMatch(/^Nate Best, CMIP® \| /);
    await expect(
      page.locator('h1 abbr[title="Certified Medicare Insurance Planner™"]'),
    ).toHaveText("CMIP");
    await expect(page.locator("h1 sup")).toHaveText("®");
    await expect(
      page.getByRole("heading", { level: 2, name: "Credentials & licences" }),
    ).toBeVisible();
    await expect(
      page.getByText("Certified Medicare Insurance Planner™ (CMIP®)"),
    ).toBeVisible();
    await expect(page.getByText("Licensed since 2015")).toBeVisible();
    await expect(page.getByText("1,400+ clients served")).toBeVisible();
  });

  for (const slug of ["renata-cruz", "marcus-bell"]) {
    test(`/team/${slug} is 404`, async ({ page }) => {
      const response = await page.goto(`/team/${slug}`);
      expect(response?.status()).toBe(404);
    });
  }
});

test("/: header and footer lockups carry the same real-text name", async ({
  page,
}) => {
  await page.goto("/");

  const header = page.locator("header [data-brand-lockup]");
  const footer = page.locator("footer [data-brand-lockup]");
  const name = ((await header.textContent()) ?? "").trim();

  expect(name, "header lockup has no text").not.toBe("");
  expect(((await footer.textContent()) ?? "").trim()).toBe(name);
  await expect(page.locator("header").getByRole("link", { name })).toHaveCount(
    1,
  );
  await expect(header.locator("img")).toHaveCount(0);
  await expect(footer.locator("img")).toHaveCount(0);

  for (const target of [
    page.locator("header [data-brand-wordmark]"),
    page.locator("footer [data-brand-logo]"),
  ]) {
    await expect(target).toBeVisible();
    expect((await target.boundingBox())!.width).toBeGreaterThan(0);
  }

  const markLeft = (await page
    .locator("header [data-brand-mark]")
    .boundingBox())!.x;
  const barLeft = (await page
    .locator("header [data-header-utility] [data-effects-pause]")
    .boundingBox())!.x;
  expect(Math.abs(markLeft - barLeft)).toBeLessThanOrEqual(1);
});

const HEADER = "header[data-site-header]";
const HEADER_ROUTES = ["/", "/contact", "/privacy"];
const PHONE_NAME = /^Call \(\d{3}\) \d{3}-\d{4}$/;

test.describe("the header: one dark bar, Nate's chip and the gold phone", () => {
  test("chip, phone and targets at 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

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
      expect(visible, route).toBe("Call");
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
});

for (const viewport of [
  { width: 1440, height: 900, gap: 64 },
  { width: 390, height: 844, gap: 40 },
]) {
  test(`content starts ${viewport.gap}px below the band or header on every inner page at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const path of ["/services", "/learn", "/team", "/contact"]) {
      await page.goto(path);
      const gap = await page.evaluate(() => {
        const band = document.querySelector("[data-page-band]");
        const header = document.querySelector("header[data-site-header]")!;
        const top = (band ?? header).getBoundingClientRect().bottom;
        const first = [
          ...document.querySelectorAll<HTMLElement>(
            "main h1, main h2, main nav, main section p",
          ),
        ]
          .map((el) => el.getBoundingClientRect().top)
          .filter((y) => y > top + 1)
          .sort((a, b) => a - b)[0]!;
        return Math.round(first - top);
      });
      expect(gap, path).toBe(viewport.gap);
    }
  });
}

test("the learning filter pills line up with the page content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/learn");

  const pills = page.locator('nav[aria-label="Filter resources by type"]');
  await expect(pills).toBeVisible();
  const pillsLeft = (await pills.boundingBox())!.x;
  const headingLeft = (await page.locator("#learn-heading").boundingBox())!.x;
  expect(pillsLeft).toBeGreaterThan(0);
  expect(Math.abs(pillsLeft - headingLeft)).toBeLessThanOrEqual(1);
});
