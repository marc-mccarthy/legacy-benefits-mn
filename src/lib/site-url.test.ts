import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));

vi.mock("next/headers", () => ({ headers }));

const { getSiteUrl } = await import("./site-url");

/** Stand in for the request headers Next would supply. */
function incoming(values: Record<string, string> = {}) {
  headers.mockResolvedValue(new Headers(values));
}

beforeEach(() => {
  headers.mockReset();
  incoming();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("when NEXT_PUBLIC_SITE_URL is configured", () => {
  it("uses it verbatim", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agency.example");
    await expect(getSiteUrl()).resolves.toBe("https://agency.example");
  });

  it("does not read the request at all", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agency.example");

    await getSiteUrl();

    expect(headers).not.toHaveBeenCalled();
  });

  it("strips a trailing slash so callers can append a path", async () => {
    // Every consumer does `${origin}/some/path`; a kept slash would produce
    // canonical URLs with a double slash.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agency.example/");
    await expect(getSiteUrl()).resolves.toBe("https://agency.example");
  });

  it("keeps a local development origin with its port", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });

  it("falls through to the request when set to an empty string", async () => {
    // .env.example ships variables blank, so "" must mean "not configured".
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    incoming({ host: "cloudfront.example.net" });

    await expect(getSiteUrl()).resolves.toBe("https://cloudfront.example.net");
  });

  it("strips only one trailing slash", async () => {
    // WORTH KNOWING: the regex is anchored to a single slash, so a doubled
    // one survives and every canonical URL gains an extra separator. Low
    // stakes and easy to spot, but it is not normalised away.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agency.example//");
    await expect(getSiteUrl()).resolves.toBe("https://agency.example/");
  });

  it("returns a whitespace-only value as configured", async () => {
    // WORTH KNOWING, same family as the other blank-vs-unset traps: this
    // reads process.env directly rather than through env(), so "   " is
    // truthy and becomes the site origin — producing broken canonical URLs
    // and a broken sitemap rather than falling back to the request host.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "   ");

    await expect(getSiteUrl()).resolves.toBe("   ");
    expect(headers).not.toHaveBeenCalled();
  });
});

describe("deriving the origin from the request", () => {
  it("prefers x-forwarded-host", async () => {
    // CloudFront sets this to the hostname the visitor actually used; `host`
    // is the internal ALB target by that point.
    incoming({
      "x-forwarded-host": "www.agency.example",
      host: "internal-alb.us-east-1.elb.amazonaws.com",
    });

    await expect(getSiteUrl()).resolves.toBe("https://www.agency.example");
  });

  it("falls back to host", async () => {
    incoming({ host: "d123.cloudfront.net" });
    await expect(getSiteUrl()).resolves.toBe("https://d123.cloudfront.net");
  });

  it("defaults the scheme to https", async () => {
    // Everything in front of the app terminates TLS, so https is the right
    // assumption when nothing says otherwise.
    incoming({ host: "d123.cloudfront.net" });
    await expect(getSiteUrl()).resolves.toMatch(/^https:\/\//);
  });

  it("honours x-forwarded-proto", async () => {
    incoming({ host: "localhost:3000", "x-forwarded-proto": "http" });
    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });

  it("takes the first hop of a chained x-forwarded-proto", async () => {
    incoming({
      host: "www.agency.example",
      "x-forwarded-proto": "https,http",
    });

    await expect(getSiteUrl()).resolves.toBe("https://www.agency.example");
  });

  it("takes the first hop of a chained host", async () => {
    incoming({ "x-forwarded-host": "www.agency.example, internal.local" });
    await expect(getSiteUrl()).resolves.toBe("https://www.agency.example");
  });

  it("trims whitespace around the chosen host", async () => {
    incoming({ "x-forwarded-host": "  www.agency.example  , internal.local" });
    await expect(getSiteUrl()).resolves.toBe("https://www.agency.example");
  });

  it("keeps a port on the host", async () => {
    incoming({ host: "localhost:3000", "x-forwarded-proto": "http" });
    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });
});

describe("when the request names no host", () => {
  it("falls back to the local development origin", async () => {
    // No configured URL and no host header: a build-time or test render.
    // Returning a valid absolute URL keeps JSON-LD and sitemap generation
    // from emitting malformed links.
    incoming();
    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });

  it("ignores the proto header when there is no host", async () => {
    incoming({ "x-forwarded-proto": "https" });
    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });
});
