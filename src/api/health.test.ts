import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { execute } }));

const { GET } = await import("./health");

beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [{ "?column?": 1 }] });
});

describe("a healthy task", () => {
  it("reports ok with a 200", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "ok",
      database: "up",
    });
  });

  it("proves the database is reachable rather than assuming it", async () => {
    // A task that cannot reach Postgres cannot capture a lead, so the check
    // has to touch the database — returning 200 unconditionally would keep a
    // useless task in the load balancer.
    await GET();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("an unreachable database", () => {
  it("reports degraded with a 503", async () => {
    execute.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await GET();

    // 503 is what makes the ALB pull this task out of rotation.
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      status: "degraded",
      database: "down",
    });
  });

  it.each([
    ["a connection failure", new Error("ECONNREFUSED")],
    ["a query timeout", new Error("statement timeout")],
    ["a non-Error rejection", "pool exhausted"],
  ])("treats %s as unhealthy", async (_label, failure) => {
    execute.mockRejectedValueOnce(failure);

    expect((await GET()).status).toBe(503);
  });

  it("never throws, so the health check always answers", async () => {
    // An unhandled rejection here would make the container look hung rather
    // than unhealthy, which is a slower and less obvious failure.
    execute.mockRejectedValueOnce(new Error("boom"));

    await expect(GET()).resolves.toBeInstanceOf(Response);
  });

  it("recovers once the database comes back", async () => {
    execute.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect((await GET()).status).toBe(503);

    expect((await GET()).status).toBe(200);
  });
});

describe("the response shape", () => {
  it("is JSON both ways, so one parser handles either outcome", async () => {
    const healthy = await GET();
    execute.mockRejectedValueOnce(new Error("down"));
    const degraded = await GET();

    expect(healthy.headers.get("content-type")).toContain("application/json");
    expect(degraded.headers.get("content-type")).toContain("application/json");
  });

  it("never leaks the underlying error to the caller", async () => {
    // This endpoint is reachable from the load balancer; a driver message
    // could disclose the connection string or internal hostnames.
    execute.mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 10.20.3.4:5432 for user 'app'"),
    );

    const body = JSON.stringify(await (await GET()).json());

    expect(body).not.toContain("10.20.3.4");
    expect(body).not.toContain("ECONNREFUSED");
  });
});
