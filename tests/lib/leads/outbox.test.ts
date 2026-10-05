import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, schema, getCrmTransport } = vi.hoisted(() => ({
  schema: { crmOutbox: { id: { __column: "id" } } },
  db: { execute: vi.fn(), update: vi.fn() },
  getCrmTransport: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db, schema }));
vi.mock("@/lib/crm", () => ({ getCrmTransport }));

vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ column, value }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

const { MAX_ATTEMPTS, backoffMs, countFailed, drainOutbox } =
  await import("@/lib/leads/outbox");

type Row = {
  id: number;
  idempotency_key: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 1,
    idempotency_key: "key-1",
    payload: { name: "Jane Doe", email: "jane@example.com" },
    attempts: 1,
    ...overrides,
  };
}

const updates: Array<Record<string, unknown>> = [];
const send = vi.fn();

function claims(...rows: Row[]) {
  db.execute.mockResolvedValueOnce({ rows });
}

beforeEach(() => {
  updates.length = 0;
  send.mockReset().mockResolvedValue({ ok: true });
  getCrmTransport.mockReset().mockReturnValue({ name: "mock", send });
  db.execute.mockReset().mockResolvedValue({ rows: [] });
  db.update.mockReset().mockImplementation(() => ({
    set(values: Record<string, unknown>) {
      updates.push(values);
      return { where: async () => undefined };
    },
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("backoffMs", () => {
  it("starts at one minute", () => {
    expect(backoffMs(1)).toBe(60_000);
  });

  it("doubles with each attempt", () => {
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(240_000);
    expect(backoffMs(6)).toBe(1_920_000);
  });

  it("caps at one hour", () => {
    expect(backoffMs(7)).toBe(3_600_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});

describe("drainOutbox with nothing due", () => {
  it("reports an empty run", async () => {
    await expect(drainOutbox()).resolves.toEqual({
      claimed: 0,
      sent: 0,
      retrying: 0,
      failed: 0,
    });
  });

  it("does not call the CRM", async () => {
    await drainOutbox();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("drainOutbox claim statement", () => {
  it("claims 25 rows by default", async () => {
    await drainOutbox();
    expect(db.execute.mock.calls[0][0].values).toContain(25);
  });

  it("honours an explicit limit", async () => {
    await drainOutbox(5);
    expect(db.execute.mock.calls[0][0].values).toContain(5);
  });

  it("leases each claimed row for five minutes", async () => {
    await drainOutbox();

    expect(db.execute.mock.calls[0][0].values).toContain("300000 milliseconds");
  });
});

describe("drainOutbox delivery", () => {
  it("hands the stored payload and key to the transport", async () => {
    const payload = { name: "Jane Doe", email: "jane@example.com" };
    claims(row({ payload, idempotency_key: "key-abc" }));

    await drainOutbox();

    expect(send).toHaveBeenCalledWith(payload, "key-abc");
  });

  it("marks a delivered row sent and clears the last error", async () => {
    claims(row());

    await expect(drainOutbox()).resolves.toEqual({
      claimed: 1,
      sent: 1,
      retrying: 0,
      failed: 0,
    });
    expect(updates[0]).toMatchObject({ status: "sent", lastError: null });
    expect(updates[0].sentAt).toBeInstanceOf(Date);
  });

  it("counts every row it claimed", async () => {
    claims(row({ id: 1 }), row({ id: 2 }), row({ id: 3 }));
    expect((await drainOutbox()).claimed).toBe(3);
  });
});

describe("drainOutbox retries", () => {
  it("leaves a retryable failure pending", async () => {
    claims(row({ attempts: 1 }));
    send.mockResolvedValueOnce({
      ok: false,
      error: "HTTP 503: upstream down",
      retryable: true,
    });

    await expect(drainOutbox()).resolves.toEqual({
      claimed: 1,
      sent: 0,
      retrying: 1,
      failed: 0,
    });
    expect(updates[0]).toMatchObject({
      status: "pending",
      lastError: "HTTP 503: upstream down",
    });
  });

  it("schedules the next attempt using the backoff for this attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
    claims(row({ attempts: 3 }));
    send.mockResolvedValueOnce({ ok: false, error: "boom", retryable: true });

    await drainOutbox();

    const next = updates[0].nextAttemptAt as Date;
    expect(next.getTime()).toBe(Date.now() + backoffMs(3));
  });

  it("truncates a long error so it fits the column", async () => {
    claims(row());
    send.mockResolvedValueOnce({
      ok: false,
      error: "x".repeat(5000),
      retryable: true,
    });

    await drainOutbox();

    expect(updates[0].lastError).toHaveLength(1000);
  });

  it("keeps retrying on the attempt before the limit", async () => {
    claims(row({ attempts: MAX_ATTEMPTS - 1 }));
    send.mockResolvedValueOnce({ ok: false, error: "boom", retryable: true });

    const result = await drainOutbox();

    expect(result).toMatchObject({ retrying: 1, failed: 0 });
    expect(updates[0].status).toBe("pending");
  });
});

describe("drainOutbox give-up conditions", () => {
  it("gives up immediately on a non-retryable failure", async () => {
    claims(row({ attempts: 1 }));
    send.mockResolvedValueOnce({
      ok: false,
      error: "HTTP 422: bad payload",
      retryable: false,
    });

    await expect(drainOutbox()).resolves.toMatchObject({
      failed: 1,
      retrying: 0,
    });
    expect(updates[0].status).toBe("failed");
  });

  it("gives up once attempts reach the limit", async () => {
    claims(row({ attempts: MAX_ATTEMPTS }));
    send.mockResolvedValueOnce({ ok: false, error: "boom", retryable: true });

    await expect(drainOutbox()).resolves.toMatchObject({ failed: 1 });
    expect(updates[0].status).toBe("failed");
  });

  it("stops after eight attempts", () => {
    expect(MAX_ATTEMPTS).toBe(8);
  });
});

describe("drainOutbox with mixed outcomes", () => {
  it("tallies each row independently", async () => {
    claims(row({ id: 1 }), row({ id: 2 }), row({ id: 3 }), row({ id: 4 }));
    send
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "503", retryable: true })
      .mockResolvedValueOnce({ ok: false, error: "422", retryable: false })
      .mockResolvedValueOnce({ ok: true });

    await expect(drainOutbox()).resolves.toEqual({
      claimed: 4,
      sent: 2,
      retrying: 1,
      failed: 1,
    });
  });

  it("keeps processing after one row fails", async () => {
    claims(row({ id: 1 }), row({ id: 2 }));
    send
      .mockResolvedValueOnce({ ok: false, error: "503", retryable: true })
      .mockResolvedValueOnce({ ok: true });

    await drainOutbox();

    expect(send).toHaveBeenCalledTimes(2);
    expect(updates[1]).toMatchObject({ status: "sent" });
  });
});

describe("countFailed", () => {
  it("reads the alarm metric", async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ count: "7" }] });
    await expect(countFailed()).resolves.toBe(7);
  });

  it("reports zero when the query returns nothing", async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    await expect(countFailed()).resolves.toBe(0);
  });
});
