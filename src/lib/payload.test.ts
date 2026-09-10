import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = { __mock: "payload-config" };

// The real config pulls in the Postgres adapter, S3 storage and every
// collection, none of which a unit spec should boot.
vi.mock("@payload-config", () => ({ default: config }));

// unstable_cache wraps the getter in Next's cache machinery, which needs a
// request scope. Passing the function straight through keeps getSiteSettings
// callable and its body observable.
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
}));

// Hoisted so the vi.mock factory below — which vitest lifts above this file's
// imports — can close over the same spies the tests assert on.
const { find, findGlobal, getPayload } = vi.hoisted(() => {
  const find = vi.fn();
  const findGlobal = vi.fn();
  return {
    find,
    findGlobal,
    getPayload: vi.fn(async () => ({ find, findGlobal })),
  };
});

vi.mock("payload", () => ({ getPayload }));

const {
  getArticles,
  getCarriers,
  getCategories,
  getDocBySlug,
  getPageBySlug,
  getPayloadClient,
  getServices,
  getSiteSettings,
  getTeam,
  getTestimonials,
  getUpcomingEvents,
} = await import("./payload");

/** payload.find always returns a paginated envelope; docs is what most callers want. */
function page<T>(docs: T[]) {
  return { docs, totalDocs: docs.length, page: 1 };
}

beforeEach(() => {
  find.mockReset().mockResolvedValue(page([]));
  findGlobal.mockReset().mockResolvedValue({ id: 1 });
  getPayload.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

/** The single argument object the code under test passed to payload.find. */
function findArgs(call = 0) {
  return find.mock.calls[call][0];
}

describe("getPayloadClient", () => {
  it("builds the local client from the project config", async () => {
    await getPayloadClient();
    expect(getPayload).toHaveBeenCalledWith({ config });
  });
});

describe("getSiteSettings", () => {
  it("reads the site-settings global with relationships populated", async () => {
    findGlobal.mockResolvedValueOnce({ id: 1, businessName: "Acme" });

    await expect(getSiteSettings()).resolves.toMatchObject({
      businessName: "Acme",
    });
    expect(findGlobal).toHaveBeenCalledWith({
      slug: "site-settings",
      depth: 1,
    });
  });
});

describe("getPageBySlug", () => {
  it("queries a single page by slug at depth 2", async () => {
    find.mockResolvedValueOnce(page([{ id: 7, slug: "about" }]));

    await expect(getPageBySlug("about")).resolves.toMatchObject({ id: 7 });
    expect(findArgs()).toEqual({
      collection: "pages",
      where: { slug: { equals: "about" } },
      limit: 1,
      depth: 2,
    });
  });

  it("returns null rather than undefined when no page matches", async () => {
    // Pages branch on `=== null`; undefined would slip through those checks.
    await expect(getPageBySlug("missing")).resolves.toBeNull();
  });
});

describe("ordered list getters", () => {
  const cases = [
    { name: "getServices", fn: getServices, collection: "services", limit: 50 },
    { name: "getTeam", fn: getTeam, collection: "team", limit: 50 },
    {
      name: "getTestimonials",
      fn: getTestimonials,
      collection: "testimonials",
      limit: 20,
    },
    { name: "getCarriers", fn: getCarriers, collection: "carriers", limit: 50 },
  ] as const;

  it.each(cases)(
    "$name reads $collection sorted by the editor's order field",
    async ({ fn, collection, limit }) => {
      await fn();
      expect(findArgs()).toEqual({
        collection,
        sort: "order",
        limit,
        depth: 1,
      });
    },
  );

  it.each(cases)(
    "$name unwraps docs from the paginated result",
    async ({ fn }) => {
      find.mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }]));
      await expect(fn()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    },
  );
});

describe("getCategories", () => {
  it("reads categories unsorted with a high limit", async () => {
    find.mockResolvedValueOnce(page([{ id: 3 }]));

    await expect(getCategories()).resolves.toEqual([{ id: 3 }]);
    expect(findArgs()).toEqual({ collection: "categories", limit: 100 });
  });
});

describe("getUpcomingEvents", () => {
  it("excludes events that have already started", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));

    await getUpcomingEvents();

    expect(findArgs()).toEqual({
      collection: "events",
      where: { startsAt: { greater_than: "2026-10-15T12:00:00.000Z" } },
      sort: "startsAt",
      limit: 12,
      depth: 1,
    });
  });

  it("defaults to 12 events", async () => {
    await getUpcomingEvents();
    expect(findArgs().limit).toBe(12);
  });

  it("honours an explicit limit", async () => {
    await getUpcomingEvents(3);
    expect(findArgs().limit).toBe(3);
  });

  it("unwraps docs", async () => {
    find.mockResolvedValueOnce(page([{ id: 9 }]));
    await expect(getUpcomingEvents()).resolves.toEqual([{ id: 9 }]);
  });
});

describe("getArticles", () => {
  it("applies no filter when neither type nor category is given", async () => {
    await getArticles({});
    expect(findArgs().where).toEqual({});
  });

  it("filters by type alone", async () => {
    await getArticles({ type: "guide" });
    expect(findArgs().where).toEqual({ type: { equals: "guide" } });
  });

  it("filters by category through the relationship's slug", async () => {
    await getArticles({ category: "medicare-basics" });
    expect(findArgs().where).toEqual({
      "categories.slug": { equals: "medicare-basics" },
    });
  });

  it("combines both filters", async () => {
    await getArticles({ type: "guide", category: "medicare-basics" });
    expect(findArgs().where).toEqual({
      type: { equals: "guide" },
      "categories.slug": { equals: "medicare-basics" },
    });
  });

  it("ignores empty-string filters", async () => {
    // The listing page reads these off the query string, where an absent
    // param arrives as "" — that must not become `equals: ""`.
    await getArticles({ type: "", category: "" });
    expect(findArgs().where).toEqual({});
  });

  it("defaults to page 1 with 9 per page, newest first", async () => {
    await getArticles({});
    expect(findArgs()).toMatchObject({
      collection: "articles",
      sort: "-publishedAt",
      page: 1,
      limit: 9,
      depth: 1,
    });
  });

  it("honours explicit paging", async () => {
    await getArticles({ page: 3, limit: 24 });
    expect(findArgs()).toMatchObject({ page: 3, limit: 24 });
  });

  it("returns the whole paginated envelope, not just docs", async () => {
    // The listing page needs totalDocs to render pagination.
    const envelope = page([{ id: 1 }]);
    find.mockResolvedValueOnce(envelope);
    await expect(getArticles({})).resolves.toBe(envelope);
  });
});

describe("getDocBySlug", () => {
  it.each(["services", "team", "events", "articles"] as const)(
    "looks up a %s document by slug",
    async (collection) => {
      find.mockResolvedValueOnce(page([{ id: 4, slug: "hello" }]));

      await expect(getDocBySlug(collection, "hello")).resolves.toMatchObject({
        id: 4,
      });
      expect(findArgs()).toEqual({
        collection,
        where: { slug: { equals: "hello" } },
        limit: 1,
        depth: 2,
      });
    },
  );

  it("returns null when the slug matches nothing", async () => {
    // Detail pages call notFound() on null; undefined would render an empty page.
    await expect(getDocBySlug("articles", "nope")).resolves.toBeNull();
  });
});
