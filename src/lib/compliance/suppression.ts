import { or, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

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
  const digits = phone?.replace(/\D/g, "");
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

/** Store phone numbers digits-only so formatting cannot defeat suppression. */
export function normalizePhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits && digits.length >= 10 ? digits : undefined;
}
