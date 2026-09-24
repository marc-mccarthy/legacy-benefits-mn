import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteUrl } = vi.hoisted(() => ({ getSiteUrl: vi.fn() }));

vi.mock("@/lib/site-url", () => ({ getSiteUrl }));

const sitemap = (await import("./sitemap")).default;
const { articles } = await import("@/content/articles");
const { events } = await import("@/content/events");
const { services } = await import("@/content/services");
const { team } = await import("@/content/team");

const ORIGIN = "https://agency.example";

const STATIC_PATHS = [
  "",
  "/services",
  "/team",
  "/events",
  "/learn",
  "/contact",
  "/scope-of-appointment",
  "/disclosures",
  "/privacy",
  "/accessibility",
  "/do-not-contact",
];

beforeEach(() => {
  getSiteUrl.mockReset().mockReturnValue(ORIGIN);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("static routes", () => {
  it("lists every public page", () => {
    const urls = sitemap().map((e) => e.url);

    for (const path of STATIC_PATHS) {
      expect(urls, `missing ${path || "/"}`).toContain(`${ORIGIN}${path}`);
    }
  });

  it("includes the compliance pages a Medicare site must publish", () => {
    const urls = sitemap().map((e) => e.url);

    // These exist to be findable, so being absent from the sitemap defeats
    // the point of having them.
    expect(urls).toContain(`${ORIGIN}/disclosures`);
    expect(urls).toContain(`${ORIGIN}/scope-of-appointment`);
    expect(urls).toContain(`${ORIGIN}/do-not-contact`);
    expect(urls).toContain(`${ORIGIN}/privacy`);
    expect(urls).toContain(`${ORIGIN}/accessibility`);
  });

  it("gives the homepage top priority", () => {
    expect(sitemap().find((e) => e.url === ORIGIN)).toMatchObject({
      priority: 1,
      changeFrequency: "weekly",
    });
  });

  it("gives other static pages a lower priority", () => {
    expect(sitemap().find((e) => e.url === `${ORIGIN}/contact`)).toMatchObject({
      priority: 0.7,
    });
  });

  it("builds the homepage URL with no trailing slash", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(ORIGIN);
    expect(urls).not.toContain(`${ORIGIN}/`);
  });

  it("follows the configured origin", () => {
    getSiteUrl.mockReturnValueOnce("https://d123.cloudfront.net");

    expect(sitemap().map((e) => e.url)).toContain(
      "https://d123.cloudfront.net/contact",
    );
  });
});

describe("content routes", () => {
  it("maps each collection under its public prefix", () => {
    const urls = sitemap().map((e) => e.url);

    expect(urls).toContain(`${ORIGIN}/services/medicare-advantage`);
    expect(urls).toContain(`${ORIGIN}/team/owner`);
    expect(urls).toContain(`${ORIGIN}/events/medicare-basics-workshop`);
    // Articles live under /learn, not /articles.
    expect(urls).toContain(`${ORIGIN}/learn/when-can-i-change-my-plan`);
  });

  it("lists every slug in every collection", () => {
    const urls = sitemap().map((e) => e.url);

    for (const item of services)
      expect(urls).toContain(`${ORIGIN}/services/${item.slug}`);
    for (const item of team)
      expect(urls).toContain(`${ORIGIN}/team/${item.slug}`);
    for (const item of events)
      expect(urls).toContain(`${ORIGIN}/events/${item.slug}`);
    for (const item of articles)
      expect(urls).toContain(`${ORIGIN}/learn/${item.slug}`);
  });

  it("gives content entries a lower priority than static pages", () => {
    const entry = sitemap().find((e) =>
      e.url.endsWith("/learn/when-can-i-change-my-plan"),
    );

    expect(entry).toMatchObject({ priority: 0.6, changeFrequency: "monthly" });
  });

  it("appends content after the static routes", () => {
    const urls = sitemap().map((e) => e.url);
    expect(
      urls.indexOf(`${ORIGIN}/services/medicare-advantage`),
    ).toBeGreaterThan(urls.indexOf(`${ORIGIN}/do-not-contact`));
  });
});

describe("the whole route set", () => {
  it("carries one entry per published route and no duplicates", () => {
    const urls = sitemap().map((e) => e.url);
    const expected =
      STATIC_PATHS.length +
      services.length +
      team.length +
      events.length +
      articles.length;

    expect(urls).toHaveLength(expected);
    expect(new Set(urls).size).toBe(expected);
  });

  it("puts every URL on the configured origin", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(ORIGIN)).toBe(true);
    }
  });

  it("needs no database", () => {
    // Nothing to mock: the routes come from `src/content/`.
    expect(() => sitemap()).not.toThrow();
  });
});

describe("lastModified", () => {
  it("stamps every route with the build time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

    for (const entry of sitemap()) {
      expect((entry.lastModified as Date).toISOString()).toBe(
        "2026-09-08T12:00:00.000Z",
      );
    }
  });
});
