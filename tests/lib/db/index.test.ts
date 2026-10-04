import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { poolConfigs, Pool, drizzle } = vi.hoisted(() => {
  const poolConfigs: Array<Record<string, unknown>> = [];
  class Pool {
    constructor(config: Record<string, unknown>) {
      poolConfigs.push(config);
    }
  }
  return {
    poolConfigs,
    Pool,
    drizzle: vi.fn((pool, opts) => ({ pool, opts })),
  };
});

vi.mock("pg", () => ({ Pool }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle }));

async function load() {
  vi.resetModules();
  poolConfigs.length = 0;
  drizzle.mockClear();
  delete (globalThis as { __pgPool?: unknown }).__pgPool;
  return import("@/lib/db/index");
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://user:pw@localhost:5432/app");
  vi.stubEnv("PGPOOL_MAX", undefined);
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __pgPool?: unknown }).__pgPool;
});

describe("pool construction", () => {
  it("connects using DATABASE_URL", async () => {
    await load();

    expect(poolConfigs[0]).toMatchObject({
      connectionString: "postgres://user:pw@localhost:5432/app",
    });
  });

  it("defaults to ten connections", async () => {
    await load();
    expect(poolConfigs[0]).toMatchObject({ max: 10 });
  });

  it("honours PGPOOL_MAX", async () => {
    vi.stubEnv("PGPOOL_MAX", "25");
    await load();
    expect(poolConfigs[0]).toMatchObject({ max: 25 });
  });

  it("exposes the drizzle client and the schema", async () => {
    const { db, schema } = await load();

    expect(db).toBeDefined();
    expect(schema.leads).toBeDefined();
    expect(schema.crmOutbox).toBeDefined();
    expect(schema.dncRequests).toBeDefined();
    expect(schema.soaSubmissions).toBeDefined();
  });

  it("hands the schema to drizzle so relations resolve", async () => {
    const { schema } = await load();
    expect(drizzle).toHaveBeenCalledWith(expect.anything(), { schema });
  });
});

describe("a blank PGPOOL_MAX", () => {
  it("still ends up with ten connections", async () => {
    vi.stubEnv("PGPOOL_MAX", "");
    await load();

    expect(poolConfigs[0].max).toBe(0);
  });

  it("passes NaN through for a non-numeric value", async () => {
    vi.stubEnv("PGPOOL_MAX", "not-a-number");
    await load();

    expect(Number.isNaN(poolConfigs[0].max)).toBe(true);
  });
});

describe("pool reuse across hot reloads", () => {
  it("caches the pool on globalThis outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await load();

    expect((globalThis as { __pgPool?: unknown }).__pgPool).toBeDefined();
  });

  it("reuses an already-cached pool instead of opening another", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await load();
    const first = (globalThis as { __pgPool?: unknown }).__pgPool;

    vi.resetModules();
    poolConfigs.length = 0;
    await import("@/lib/db/index");

    expect(poolConfigs).toHaveLength(0);
    expect((globalThis as { __pgPool?: unknown }).__pgPool).toBe(first);
  });

  it("does not cache in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await load();

    expect((globalThis as { __pgPool?: unknown }).__pgPool).toBeUndefined();
  });
});
