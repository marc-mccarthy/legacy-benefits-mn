import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { setCrmTransport } from "@/lib/crm";
import { MockTransport } from "@/lib/crm/transports/mock";
import { captureLead } from "@/lib/leads/service";
import { backoffMs, drainOutbox, MAX_ATTEMPTS } from "@/lib/leads/outbox";

const lead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "(612) 555-0100",
  zip: "55101",
  interest: "medicare-advantage" as const,
  message: "Please call me about my October enrollment.",
  consent: true as const,
  sourcePath: "/contact",
};

async function reset() {
  await db.execute(sql`TRUNCATE TABLE leads RESTART IDENTITY CASCADE`);
}

beforeEach(reset);
afterEach(() => setCrmTransport(undefined));

describe("captureLead", () => {
  it("writes the lead and a pending outbox row in one transaction", async () => {
    const { leadId } = await captureLead(lead, { ip: "203.0.113.5" });

    const [row] = await db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.id, leadId));
    expect(row.email).toBe("jane@example.com");
    expect(row.consentedAt).toBeInstanceOf(Date);
    expect(row.ipHash).not.toBe("203.0.113.5");
    expect(row.ipHash).toMatch(/^[a-f0-9]{64}$/);

    const outbox = await db.select().from(schema.crmOutbox);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].status).toBe("pending");
    expect(outbox[0].attempts).toBe(0);
  });
});

describe("drainOutbox", () => {
  it("delivers a pending lead and marks it sent", async () => {
    await captureLead(lead);
    const transport = new MockTransport("ok");
    setCrmTransport(transport);

    const result = await drainOutbox();

    expect(result).toMatchObject({ claimed: 1, sent: 1, failed: 0 });
    expect(transport.sent[0].lead.email).toBe("jane@example.com");

    const [row] = await db.select().from(schema.crmOutbox);
    expect(row.status).toBe("sent");
    expect(row.sentAt).toBeInstanceOf(Date);
  });

  it("sends the same idempotency key the row was created with", async () => {
    await captureLead(lead);
    const transport = new MockTransport("ok");
    setCrmTransport(transport);

    const [before] = await db.select().from(schema.crmOutbox);
    await drainOutbox();

    expect(transport.sent[0].idempotencyKey).toBe(before.idempotencyKey);
  });

  it("keeps a retryable failure pending and backs off", async () => {
    await captureLead(lead);
    setCrmTransport(new MockTransport("retryable"));

    const result = await drainOutbox();

    expect(result).toMatchObject({
      claimed: 1,
      sent: 0,
      retrying: 1,
      failed: 0,
    });
    const [row] = await db.select().from(schema.crmOutbox);
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(1);
    expect(row.lastError).toContain("503");
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("gives up immediately on a non-retryable failure", async () => {
    await captureLead(lead);
    setCrmTransport(new MockTransport("fatal"));

    const result = await drainOutbox();

    expect(result).toMatchObject({ failed: 1, retrying: 0 });
    const [row] = await db.select().from(schema.crmOutbox);
    expect(row.status).toBe("failed");
  });

  it("does not claim a row whose next attempt is still in the future", async () => {
    await captureLead(lead);
    await db
      .update(schema.crmOutbox)
      .set({ nextAttemptAt: new Date(Date.now() + 60_000) });

    setCrmTransport(new MockTransport("ok"));
    expect(await drainOutbox()).toMatchObject({ claimed: 0 });
  });

  it("leases a claimed row so an overlapping run cannot double-send", async () => {
    await captureLead(lead);
    setCrmTransport(new MockTransport("retryable"));
    await drainOutbox();

    const second = await drainOutbox();
    expect(second.claimed).toBe(0);
  });

  it("stops retrying after MAX_ATTEMPTS", async () => {
    await captureLead(lead);
    await db.update(schema.crmOutbox).set({ attempts: MAX_ATTEMPTS - 1 });
    setCrmTransport(new MockTransport("retryable"));

    const result = await drainOutbox();

    expect(result.failed).toBe(1);
    const [row] = await db.select().from(schema.crmOutbox);
    expect(row.status).toBe("failed");
    expect(await db.select().from(schema.leads)).toHaveLength(1);
  });
});

describe("backoffMs", () => {
  it("doubles per attempt and caps at one hour", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});
