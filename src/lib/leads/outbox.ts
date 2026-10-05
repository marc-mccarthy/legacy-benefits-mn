import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCrmTransport, type CrmLead } from "@/lib/crm";

export const MAX_ATTEMPTS = 8;

const LEASE_MS = 5 * 60_000;

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

export async function countFailed(): Promise<number> {
  const res = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM crm_outbox WHERE status = 'failed'`,
  );
  return Number(res.rows[0]?.count ?? 0);
}
