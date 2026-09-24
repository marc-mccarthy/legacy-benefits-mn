import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { drainOutbox, countFailed } = vi.hoisted(() => ({
  drainOutbox: vi.fn(),
  countFailed: vi.fn(),
}));

vi.mock("@/lib/leads/outbox", () => ({ drainOutbox, countFailed }));

const { POST } = await import("./jobs-outbox");

const TOKEN = "s3cret-job-token";

function post(authorization?: string) {
  return new Request("https://agency.example/api/jobs/outbox", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  drainOutbox
    .mockReset()
    .mockResolvedValue({ claimed: 2, sent: 1, retrying: 1, failed: 0 });
  countFailed.mockReset().mockResolvedValue(3);
  vi.stubEnv("OUTBOX_JOB_TOKEN", TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("when the job token is not configured", () => {
  it("reports the misconfiguration as unavailable", async () => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", undefined);

    const res = await POST(post(`Bearer ${TOKEN}`));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: "OUTBOX_JOB_TOKEN is not configured",
    });
  });

  it("refuses to run the drain", async () => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", undefined);

    await POST(post(`Bearer ${TOKEN}`));

    // Fail closed: an unset token must never mean "no auth required".
    expect(drainOutbox).not.toHaveBeenCalled();
  });

  it("treats a blank token as unconfigured", async () => {
    // An empty value in .env is the common way this ends up unset.
    vi.stubEnv("OUTBOX_JOB_TOKEN", "");

    const res = await POST(post("Bearer "));

    expect(res.status).toBe(503);
    expect(drainOutbox).not.toHaveBeenCalled();
  });
});

describe("rejected requests", () => {
  it.each([
    ["no authorization header", undefined],
    ["an empty authorization header", ""],
    ["a non-bearer scheme", `Basic ${TOKEN}`],
    ["a lowercase scheme", `bearer ${TOKEN}`],
    ["the scheme with no space", `Bearer${TOKEN}`],
    ["a bearer prefix and nothing else", "Bearer "],
    ["an extra space before the token", `Bearer  ${TOKEN}`],
  ])("rejects %s", async (_label, header) => {
    const res = await POST(post(header));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects a wrong token of the same length", async () => {
    const wrong = "x".repeat(TOKEN.length);
    expect(wrong).toHaveLength(TOKEN.length);

    expect((await POST(post(`Bearer ${wrong}`))).status).toBe(401);
  });

  it("rejects a token that is a prefix of the real one", async () => {
    const res = await POST(post(`Bearer ${TOKEN.slice(0, -1)}`));
    expect(res.status).toBe(401);
  });

  it("rejects a longer token without throwing", async () => {
    // timingSafeEqual throws on differing byte lengths; the guard in
    // tokenMatches is what turns that into a 401 instead of a 500.
    const res = await POST(post(`Bearer ${TOKEN}extra`));
    expect(res.status).toBe(401);
  });

  it("rejects a token differing in a single character", async () => {
    const nearMiss = `${TOKEN.slice(0, -1)}X`;
    expect((await POST(post(`Bearer ${nearMiss}`))).status).toBe(401);
  });

  it("never drains the outbox for an unauthorised caller", async () => {
    await POST(post("Bearer wrong"));
    await POST(post());

    expect(drainOutbox).not.toHaveBeenCalled();
    expect(countFailed).not.toHaveBeenCalled();
  });
});

describe("multibyte tokens", () => {
  it("accepts a token whose byte length exceeds its character length", async () => {
    // Buffer.from compares bytes, not characters — an accented token must
    // still match itself.
    vi.stubEnv("OUTBOX_JOB_TOKEN", "sécret-clé");

    const res = await POST(post("Bearer sécret-clé"));

    expect(res.status).toBe(200);
  });

  it("rejects a lookalike with the same character count", async () => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", "sécret-clé");

    const res = await POST(post("Bearer secret-cle"));

    expect(res.status).toBe(401);
  });
});

describe("authorised runs", () => {
  it("drains the outbox once", async () => {
    await POST(post(`Bearer ${TOKEN}`));

    expect(drainOutbox).toHaveBeenCalledTimes(1);
    expect(countFailed).toHaveBeenCalledTimes(1);
  });

  it("returns the drain tally alongside the alarm metric", async () => {
    const res = await POST(post(`Bearer ${TOKEN}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      claimed: 2,
      sent: 1,
      retrying: 1,
      failed: 0,
      // failedTotal is the backlog needing a human, not just this run's
      // failures — it is what the CloudWatch alarm watches.
      failedTotal: 3,
    });
  });

  it("reports a quiet run", async () => {
    drainOutbox.mockResolvedValueOnce({
      claimed: 0,
      sent: 0,
      retrying: 0,
      failed: 0,
    });
    countFailed.mockResolvedValueOnce(0);

    await expect((await POST(post(`Bearer ${TOKEN}`))).json()).resolves.toEqual(
      {
        claimed: 0,
        sent: 0,
        retrying: 0,
        failed: 0,
        failedTotal: 0,
      },
    );
  });

  it("surfaces a growing failure backlog", async () => {
    countFailed.mockResolvedValueOnce(42);

    const body = await (await POST(post(`Bearer ${TOKEN}`))).json();

    expect(body.failedTotal).toBe(42);
  });

  it("accepts a token containing regex-special characters", async () => {
    // The comparison is byte equality, not a pattern match.
    const awkward = "a+b*c?d.e$f^g";
    vi.stubEnv("OUTBOX_JOB_TOKEN", awkward);

    expect((await POST(post(`Bearer ${awkward}`))).status).toBe(200);
  });
});

describe("a token configured with surrounding whitespace", () => {
  // REGRESSION GUARD.
  //
  // HTTP strips leading and trailing whitespace from header values in
  // transit, so "Bearer tok  " arrives as "Bearer tok". Reading the secret
  // with a raw process.env lookup compared "tok" against "tok\n" and 401'd
  // forever — silently halting all CRM delivery, with no signal beyond a flat
  // sent count. env() trims both sides of that comparison.
  it.each([
    ["a trailing newline", "tok\n"],
    ["trailing spaces", "tok  "],
    ["a leading space", " tok"],
    ["padding on both sides", "  tok  "],
  ])("authenticates despite %s in the stored secret", async (_l, stored) => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", stored);

    const res = await POST(post("Bearer tok"));

    expect(res.status).toBe(200);
    expect(drainOutbox).toHaveBeenCalledTimes(1);
  });

  it("still rejects a genuinely different token", async () => {
    // Trimming must not be so eager that it collapses distinct secrets.
    vi.stubEnv("OUTBOX_JOB_TOKEN", " tok ");

    expect((await POST(post("Bearer tokk"))).status).toBe(401);
  });

  it("treats a whitespace-only secret as unconfigured", async () => {
    vi.stubEnv("OUTBOX_JOB_TOKEN", "   ");

    const res = await POST(post("Bearer tok"));

    // Fail closed rather than comparing against an empty expected value.
    expect(res.status).toBe(503);
    expect(drainOutbox).not.toHaveBeenCalled();
  });
});
