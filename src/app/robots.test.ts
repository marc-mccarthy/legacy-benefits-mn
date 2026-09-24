import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteUrl } = vi.hoisted(() => ({ getSiteUrl: vi.fn() }));

vi.mock("@/lib/site-url", () => ({ getSiteUrl }));

const robots = (await import("./robots")).default;

beforeEach(() => {
  getSiteUrl.mockReset().mockReturnValue("https://agency.example");
});

describe("robots.txt", () => {
  it("allows crawlers everywhere by default", () => {
    // This is a marketing site; a stray disallow here silently deindexes it.
    expect(robots().rules).toEqual([
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ]);
  });

  it("keeps the API surface out of search results", () => {
    // /api/ with the trailing slash so it does not also match a page named
    // "/api-something".
    const rules = robots().rules as { disallow: string[] }[];
    expect(rules[0].disallow).toContain("/api/");
  });

  it("points at the sitemap on the configured origin", () => {
    expect(robots()).toMatchObject({
      sitemap: "https://agency.example/sitemap.xml",
    });
  });

  it("follows the origin it is given", () => {
    getSiteUrl.mockReturnValueOnce("https://d123.cloudfront.net");

    expect(robots()).toMatchObject({
      sitemap: "https://d123.cloudfront.net/sitemap.xml",
    });
  });

  it("builds the sitemap URL without a double slash", () => {
    getSiteUrl.mockReturnValueOnce("https://agency.example");

    expect(robots().sitemap).not.toContain("//sitemap");
  });
});
