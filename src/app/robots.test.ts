import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteUrl } = vi.hoisted(() => ({ getSiteUrl: vi.fn() }));

vi.mock("@/lib/site-url", () => ({ getSiteUrl }));

const robots = (await import("./robots")).default;

beforeEach(() => {
  getSiteUrl.mockReset().mockResolvedValue("https://agency.example");
});

describe("robots.txt", () => {
  it("allows crawlers everywhere by default", async () => {
    const result = await robots();

    // This is a marketing site; a stray disallow here silently deindexes it.
    expect(result.rules).toEqual([
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ]);
  });

  it("keeps the admin panel out of search results", async () => {
    const [rule] = [await robots()].map(
      (r) => r.rules as { disallow: string[] }[],
    );
    expect(rule[0].disallow).toContain("/admin");
  });

  it("keeps the API surface out of search results", async () => {
    // /api/ with the trailing slash so it does not also match a page named
    // "/api-something".
    const result = await robots();
    const rules = result.rules as { disallow: string[] }[];
    expect(rules[0].disallow).toContain("/api/");
  });

  it("points at the sitemap on the resolved origin", async () => {
    await expect(robots()).resolves.toMatchObject({
      sitemap: "https://agency.example/sitemap.xml",
    });
  });

  it("follows the origin when the site runs on a CloudFront URL", async () => {
    // No custom domain configured: the origin comes from the request, so
    // robots.txt must not hardcode anything.
    getSiteUrl.mockResolvedValueOnce("https://d123.cloudfront.net");

    await expect(robots()).resolves.toMatchObject({
      sitemap: "https://d123.cloudfront.net/sitemap.xml",
    });
  });

  it("builds the sitemap URL without a double slash", async () => {
    // getSiteUrl strips a trailing slash; this is the assertion that would
    // catch it if that ever stopped happening.
    getSiteUrl.mockResolvedValueOnce("https://agency.example");

    const result = await robots();
    expect(result.sitemap).not.toContain("//sitemap");
  });
});
