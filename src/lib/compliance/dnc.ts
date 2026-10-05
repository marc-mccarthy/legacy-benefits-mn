import "server-only";

import { db, schema } from "@/lib/db";
import { hashIp } from "@/lib/leads/service";
import { blankToUndefined } from "@/lib/leads/schema";
import { normalizePhone } from "./suppression";
import type { DncInput } from "./dnc-schema";

export { dncInputSchema, type DncInput } from "./dnc-schema";

export async function recordDncRequest(
  input: DncInput,
  meta: { ip?: string } = {},
): Promise<{ id: number }> {
  const [row] = await db
    .insert(schema.dncRequests)
    .values({
      email: blankToUndefined(input.email)?.toLowerCase(),
      phone: normalizePhone(input.phone),
      requestType: input.requestType,
      notes: blankToUndefined(input.notes),
      ipHash: meta.ip ? hashIp(meta.ip) : null,
    })
    .returning({ id: schema.dncRequests.id });

  return { id: row.id };
}
