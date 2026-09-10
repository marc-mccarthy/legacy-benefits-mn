import { or, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "./phone";

/**
 * True when this person has previously asked not to be contacted.
 *
 * A suppression outlives the lead it suppresses, so this is checked on every
 * capture. A suppressed submission is still recorded (the person did fill in
 * the form) but is never auto-delivered to the CRM — releasing it is a human
 * decision, because re-contacting someone who revoked consent is the exact
 * failure TCPA penalises.
 */
export async function isSuppressed(
  email?: string,
  phone?: string,
): Promise<boolean> {
  // Must use the same canonical form recordDncRequest stored, or a number
  // written differently on the way in would not match its own opt-out.
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
 * Re-exported so this module stays the one place server code reaches for
 * suppression concerns. The implementation lives in ./phone because the
 * validation schemas need it too and must not pull `pg` into a client bundle.
 */
export { normalizePhone };
