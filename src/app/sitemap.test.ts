import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteUrl, getPayloadClient, find } = vi.hoisted(() => {
  const find = vi.fn();
  return {
    find,
    getSiteUrl: vi.fn(),
    getPayloadClient: vi.fn(async () => ({ find })),
  };
});

vi.mock("@/lib/site-url", () => ({ getSiteUrl }));
vi.mock("@/lib/payload", () => ({ getPayloadClient }));

const sitemap = (await import("./sitemap")).default;

const ORIGIN = "https://agency.example";

/** payload.find returns a paginated envelope. */
function docs(...items: Array<{ slug: string; updatedAt?: string }>) {
  return { docs: items, totalDocs: items.length };
}

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
  getSiteUrl.mockReset().mockResolvedValue(ORIGIN);
  getPayloadClient.mockClear();
  find.mockReset().mockResolvedValue(docs());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("static routes", () => {
  it("lists every public page", async () => {
    const urls = (await sitemap()).map((e) => e.url);

    for (const path of STATIC_PATHS) {
      expect(urls, `missing ${path || "/"}`).toContain(`${ORIGIN}${path}`);
    }
  });

  it("includes the compliance pages a Medicare site must publish", async () => {
    const urls = (await sitemap()).map((e) => e.url);

    // These exist to be findable, so being absent from the sitemap defeats
    // the point of having them.
    expect(urls).toContain(`${ORIGIN}/disclosures`);
    expect(urls).toContain(`${ORIGIN}/scope-of-appointment`);
    expect(urls).toContain(`${ORIGIN}/do-not-contact`);
    expect(urls).toContain(`${ORIGIN}/privacy`);
    expect(urls).toContain(`${ORIGIN}/accessibility`);
  });

  it("gives the homepage top priority", async () => {
    const home = (await sitemap()).find((e) => e.url === ORIGIN);
    expect(home).toMatchObject({ priority: 1, changeFrequency: "weekly" });
  });

  it("gives other static pages a lower priority", async () => {
    const contact = (await sitemap()).find(
      (e) => e.url === `${ORIGIN}/contact`,
    );
    expect(contact).toMatchObject({ priority: 0.7 });
  });

  it("builds the homepage URL with no trailing slash", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(ORIGIN);
    expect(urls).not.toContain(`${ORIGIN}/`);
  });

  it("follows the resolved origin", async () => {
    getSiteUrl.mockResolvedValueOnce("https://d123.cloudfront.net");

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain("https://d123.cloudfront.net/contact");
  });
});

describe("content routes", () => {
  beforeEach(() => {
    find
      .mockResolvedValueOnce(docs({ slug: "medicare-advantage" }))
      .mockResolvedValueOnce(docs({ slug: "nate" }))
      .mockResolvedValueOnce(docs({ slug: "october-workshop" }))
      .mockResolvedValueOnce(docs({ slug: "what-is-part-d" }));
  });

  it("maps each collection under its public prefix", async () => {
    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain(`${ORIGIN}/services/medicare-advantage`);
    expect(urls).toContain(`${ORIGIN}/team/nate`);
    expect(urls).toContain(`${ORIGIN}/events/october-workshop`);
    // Articles live under /learn, not /articles.
    expect(urls).toContain(`${ORIGIN}/learn/what-is-part-d`);
  });

  it("queries the four public collections at depth 0", async () => {
    await sitemap();

    expect(find.mock.calls.map((c) => c[0].collection)).toEqual([
      "services",
      "team",
      "events",
      "articles",
    ]);
    // Only slugs and timestamps are needed, so relationships stay unresolved.
    for (const [args] of find.mock.calls) {
      expect(args).toMatchObject({ limit: 500, depth: 0 });
    }
  });

  it("gives content entries a lower priority than static pages", async () => {
    const entry = (await sitemap()).find((e) =>
      e.url.endsWith("/learn/what-is-part-d"),
    );

    expect(entry).toMatchObject({ priority: 0.6, changeFrequency: "monthly" });
  });

  it("appends content after the static routes", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(
      urls.indexOf(`${ORIGIN}/services/medicare-advantage`),
    ).toBeGreaterThan(urls.indexOf(`${ORIGIN}/do-not-contact`));
  });
});

describe("lastModified", () => {
  it("uses the document's updatedAt", async () => {
    find.mockResolvedValueOnce(
      docs({ slug: "a", updatedAt: "2026-05-04T10:00:00.000Z" }),
    );

    const entry = (await sitemap()).find((e) => e.url.endsWith("/services/a"));

    expect((entry?.lastModified as Date).toISOString()).toBe(
      "2026-05-04T10:00:00.000Z",
    );
  });

  it("falls back to now when a document has no updatedAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
    find.mockResolvedValueOnce(docs({ slug: "a" }));

    const entry = (await sitemap()).find((e) => e.url.endsWith("/services/a"));

    expect((entry?.lastModified as Date).toISOString()).toBe(
      "2026-09-08T12:00:00.000Z",
    );
  });

  it("stamps static routes with the current time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

    const home = (await sitemap()).find((e) => e.url === ORIGIN);

    expect((home?.lastModified as Date).toISOString()).toBe(
      "2026-09-08T12:00:00.000Z",
    );
  });
});

describe("when the database is unreachable", () => {
  it("still serves the static routes", async () => {
    getPayloadClient.mockRejectedValueOnce(new Error("connection refused"));

    const result = await sitemap();

    // A degraded sitemap beats a 500: search engines keep the pages they can
    // still see rather than the whole file failing.
    expect(result).toHaveLength(STATIC_PATHS.length);
    expect(result.map((e) => e.url)).toContain(`${ORIGIN}/contact`);
  });

  it("degrades when a collection query fails", async () => {
    find.mockRejectedValueOnce(new Error("relation does not exist"));

    const result = await sitemap();

    expect(result).toHaveLength(STATIC_PATHS.length);
  });

  it("does not throw", async () => {
    getPayloadClient.mockRejectedValueOnce(new Error("boom"));
    await expect(sitemap()).resolves.toBeInstanceOf(Array);
  });
});

describe("an empty CMS", () => {
  it("returns only the static routes", async () => {
    const result = await sitemap();
    expect(result).toHaveLength(STATIC_PATHS.length);
  });
});
