import { or, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "./phone";

export async function isSuppressed(
  email?: string,
  phone?: string,
): Promise<boolean> {
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

export { normalizePhone };
