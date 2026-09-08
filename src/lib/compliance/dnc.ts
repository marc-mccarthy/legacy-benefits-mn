import "server-only";

import { db, schema } from "@/lib/db";
import { hashIp } from "@/lib/leads/service";
import { blankToUndefined } from "@/lib/leads/schema";
import { normalizePhone } from "./suppression";
import type { DncInput } from "./dnc-schema";

export { dncInputSchema, type DncInput } from "./dnc-schema";

/**
 * Records an opt-out. Deliberately does not require identity verification for
 * revoke-contact: under TCPA, revocation must be honoured through any
 * reasonable means, and adding friction to a stop request is itself a risk.
 */
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
