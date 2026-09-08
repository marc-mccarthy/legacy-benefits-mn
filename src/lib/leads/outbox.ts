import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCrmTransport, type CrmLead } from "@/lib/crm";

/** Stop retrying after this many attempts and raise the alarm instead. */
export const MAX_ATTEMPTS = 8;

/** How long a claimed row is leased before another worker may retry it. */
const LEASE_MS = 5 * 60_000;

/** 1m, 2m, 4m … capped at 1h. */
export function backoffMs(attempt: number): number {
  return Math.min(60_000 * 2 ** (attempt - 1), 3_600_000);
}

export type DrainResult = {
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
};

type ClaimedRow = {
  id: number;
  idempotency_key: string;
  payload: Record<string, unknown>;
  attempts: number;
};

/**
 * Drains due outbox rows.
 *
 * Claiming is a single UPDATE ... FOR UPDATE SKIP LOCKED that both increments
 * the attempt count and pushes next_attempt_at out by a lease. That makes the
 * claim durable past the statement — a plain SELECT ... FOR UPDATE would drop
 * its locks the moment the implicit transaction committed, letting an
 * overlapping tick deliver the same lead twice.
 */
export async function drainOutbox(limit = 25): Promise<DrainResult> {
  const transport = getCrmTransport();
  const result: DrainResult = { claimed: 0, sent: 0, retrying: 0, failed: 0 };

  const claimed = await db.execute<ClaimedRow>(sql`
    UPDATE crm_outbox AS o
    SET attempts = o.attempts + 1,
        next_attempt_at = now() + ${`${LEASE_MS} milliseconds`}::interval
    WHERE o.id IN (
      SELECT id FROM crm_outbox
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING o.id, o.idempotency_key, o.payload, o.attempts
  `);

  result.claimed = claimed.rows.length;

  for (const row of claimed.rows) {
    const outcome = await transport.send(
      row.payload as unknown as CrmLead,
      row.idempotency_key,
    );

    if (outcome.ok) {
      await db
        .update(schema.crmOutbox)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(schema.crmOutbox.id, row.id));
      result.sent += 1;
      continue;
    }

    const giveUp = !outcome.retryable || row.attempts >= MAX_ATTEMPTS;
    await db
      .update(schema.crmOutbox)
      .set({
        status: giveUp ? "failed" : "pending",
        lastError: outcome.error.slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + backoffMs(row.attempts)),
      })
      .where(eq(schema.crmOutbox.id, row.id));

    if (giveUp) result.failed += 1;
    else result.retrying += 1;
  }

  return result;
}

/** Rows that need a human — the CloudWatch alarm metric. */
export async function countFailed(): Promise<number> {
  const res = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM crm_outbox WHERE status = 'failed'`,
  );
  return Number(res.rows[0]?.count ?? 0);
}
