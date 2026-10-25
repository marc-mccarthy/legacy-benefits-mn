import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, schema, chain } = vi.hoisted(() => {
  const chain = {
    returning: vi.fn(),
    onConflictDoNothing: vi.fn(),
    values: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  return {
    chain,
    db: {
      insert: vi.fn(),
      select: vi.fn(),
    },
    schema: {
      crmInbox: { id: { __column: "id" }, idempotencyKey: { __column: "key" } },
    },
  };
});

vi.mock("@/lib/db", () => ({ db, schema }));
vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ eq: [column, value] }),
  desc: (column: unknown) => ({ desc: column }),
}));

const { POST, GET } = await import("@/api/crm-inbox");

const SECRET = "relay-secret";
const JOB_TOKEN = "job-token";
const URL_BASE = "https://dev.example/api/crm-inbox";

const lead = {
  name: "Jane Doe",
  email: "jane@example.com",
  consentVersion: "v1",
  consentedAt: "2026-01-02T03:04:05.000Z",
  phone: "6125550100",
};

function post(body: unknown, authorization?: string) {
  return new Request(`${URL_BASE}/lead`, {
    method: "POST",
    headers: authorization ? { authorization } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { lead, idempotencyKey: "key-1", attempt: 1, ...overrides };
}

function get(authorization?: string) {
  return new Request(URL_BASE, {
    method: "GET",
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  for (const fn of Object.values(chain)) fn.mockReset();
  db.insert.mockReset().mockReturnValue({ values: chain.values });
  chain.values.mockReturnValue({
    onConflictDoNothing: chain.onConflictDoNothing,
  });
  chain.onConflictDoNothing.mockReturnValue({ returning: chain.returning });
  chain.returning.mockResolvedValue([{ id: 7 }]);
  db.select.mockReset().mockReturnValue({
    from: () => ({ where: chain.where, orderBy: chain.orderBy }),
  });
  chain.where.mockReturnValue({ limit: chain.limit });
  chain.orderBy.mockReturnValue({ limit: chain.limit });
  chain.limit.mockResolvedValue([{ id: 3 }]);
  vi.stubEnv("CRM_INBOX_ENABLED", "true");
  vi.stubEnv("CRM_RELAY_SECRET", SECRET);
  vi.stubEnv("OUTBOX_JOB_TOKEN", JOB_TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("when CRM_INBOX_ENABLED is not true", () => {
  it.each([[undefined], [""], ["false"], ["TRUE"], ["1"]])(
    "POST answers 404 for %s",
    async (flag) => {
      vi.stubEnv("CRM_INBOX_ENABLED", flag);

      const res = await POST(post(validBody(), `Bearer ${SECRET}`));

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Not found" });
      expect(db.insert).not.toHaveBeenCalled();
    },
  );

  it("POST answers 404 before checking the bearer", async () => {
    vi.stubEnv("CRM_INBOX_ENABLED", undefined);

    const wrong = await POST(post(validBody(), "Bearer wrong"));
    const missing = await POST(post(validBody()));

    expect(wrong.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("GET answers 404 before checking the bearer", async () => {
    vi.stubEnv("CRM_INBOX_ENABLED", undefined);

    expect((await GET(get("Bearer wrong"))).status).toBe(404);
    expect((await GET(get())).status).toBe(404);
  });

  it("GET answers 404", async () => {
    vi.stubEnv("CRM_INBOX_ENABLED", undefined);

    const res = await GET(get(`Bearer ${JOB_TOKEN}`));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("POST /api/crm-inbox/lead", () => {
  it("answers 503 when CRM_RELAY_SECRET is unset", async () => {
    vi.stubEnv("CRM_RELAY_SECRET", undefined);

    const res = await POST(post(validBody(), `Bearer ${SECRET}`));

    expect(res.status).toBe(503);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("answers 401 without a bearer", async () => {
    const res = await POST(post(validBody()));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it.each([
    ["Bearer relay"],
    ["Bearer relay-secret-x"],
    ["Basic relay-secret"],
  ])("answers 401 for %s", async (header) => {
    const res = await POST(post(validBody(), header));

    expect(res.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it.each([
    ["a body without a lead", { idempotencyKey: "k", attempt: 1 }],
    ["a blank lead name", validBody({ lead: { ...lead, name: "  " } })],
    [
      "a missing consentVersion",
      validBody({ lead: { ...lead, consentVersion: undefined } }),
    ],
    [
      "an unparseable consentedAt",
      validBody({ lead: { ...lead, consentedAt: "nope" } }),
    ],
    ["a missing idempotencyKey", validBody({ idempotencyKey: undefined })],
    ["attempt 0", validBody({ attempt: 0 })],
    ["a fractional attempt", validBody({ attempt: 1.5 })],
    ["a string attempt", validBody({ attempt: "1" })],
    ["a non-object body", "[]"],
  ])("answers 400 for %s", async (_label, body) => {
    const res = await POST(post(body, `Bearer ${SECRET}`));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      retryable: false,
      error: "Invalid lead request",
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON", async () => {
    const res = await POST(post("{nope", `Bearer ${SECRET}`));

    expect(res.status).toBe(400);
  });

  it("stores a new lead and answers created with the row id", async () => {
    const res = await POST(post(validBody(), `Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      indId: 7,
      outcome: "created",
    });
    expect(chain.values).toHaveBeenCalledWith({
      idempotencyKey: "key-1",
      payload: lead,
    });
    expect(chain.onConflictDoNothing).toHaveBeenCalledWith({
      target: schema.crmInbox.idempotencyKey,
    });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("answers existing for a repeated idempotency key and stores nothing new", async () => {
    chain.returning.mockResolvedValue([]);
    chain.limit.mockResolvedValue([{ id: 3 }]);

    const res = await POST(post(validBody(), `Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      indId: 3,
      outcome: "existing",
    });
    expect(chain.where).toHaveBeenCalledWith({
      eq: [schema.crmInbox.idempotencyKey, "key-1"],
    });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/crm-inbox", () => {
  it("answers 503 when OUTBOX_JOB_TOKEN is unset", async () => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", undefined);

    const res = await GET(get(`Bearer ${JOB_TOKEN}`));

    expect(res.status).toBe(503);
  });

  it.each([[undefined], ["Bearer wrong"], [`Bearer ${SECRET}`]])(
    "answers 401 for %s",
    async (header) => {
      const res = await GET(get(header));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
      expect(db.select).not.toHaveBeenCalled();
    },
  );

  it("lists the newest 50 rows", async () => {
    const rows = [{ id: 9 }, { id: 8 }];
    chain.limit.mockResolvedValue(rows);

    const res = await GET(get(`Bearer ${JOB_TOKEN}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ items: rows });
    expect(chain.orderBy).toHaveBeenCalledWith({
      desc: schema.crmInbox.id,
    });
    expect(chain.limit).toHaveBeenCalledWith(50);
  });
});
