import { or, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "./phone";

/**
 * True when this person has previously asked not to be contacted.
 *
 * Checked on every capture. A suppressed submission is still written, but is
 * not queued to the CRM — releasing it is a manual step.
 */
export async function isSuppressed(
  email?: string,
  phone?: string,
): Promise<boolean> {
  // Same canonical form recordDncRequest stored, or a differently-formatted
  // number misses its own opt-out row.
  const digits = normalizePhone(phone);
  const clauses = [];
  if (email) clauses.push(eq(schema.dncRequests.email, email.toLowerCase()));
  if (digits) clauses.push(eq(schema.dncRequests.phone, digits));
  if (clauses.length === 0) return false;

  const rows = await db
    .select({ id: schema.dncRequests.id })
    .from(schema.dncRequests)
    .where(clauses.length === 1 ? clauses[0] : or(...clauses))
    .limit(1);

  return rows.length > 0;
}

/**
 * Re-exported from ./phone, which has no `pg` import — the validation schemas
 * pull the same function into client bundles.
 */
export { normalizePhone };
