import "server-only";

import { db, schema } from "@/lib/db";
import { hashIp } from "@/lib/leads/service";
import { blankToUndefined } from "@/lib/leads/schema";
import {
  DISCLOSURE_VERSION,
  RECORD_RETENTION_YEARS,
  SOA_ATTESTATION,
} from "./disclosures";
import type { SoaInput } from "./soa-schema";

export { soaInputSchema, type SoaInput } from "./soa-schema";

// Stores the attestation text and version as shown, and does not touch the
// CRM outbox — the lead path is captureLead, not this.
export async function recordSoa(
  input: SoaInput,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{
  id: number;
  signedAt: Date;
  meetsFortyEightHourGuidance: boolean;
}> {
  const signedAt = new Date();
  const retentionUntil = new Date(signedAt);
  retentionUntil.setFullYear(
    retentionUntil.getFullYear() + RECORD_RETENTION_YEARS,
  );

  const appointmentAt = input.appointmentAt
    ? new Date(input.appointmentAt)
    : null;
  // Recorded as a flag, not enforced — a same-day appointment still submits.
  const meetsFortyEightHourGuidance = appointmentAt
    ? appointmentAt.getTime() - signedAt.getTime() >= 48 * 3600_000
    : false;

  const [row] = await db
    .insert(schema.soaSubmissions)
    .values({
      beneficiaryName: input.beneficiaryName,
      email: blankToUndefined(input.email)?.toLowerCase(),
      phone: input.phone,
      address: blankToUndefined(input.address),
      productTypes: input.productTypes,
      agentName: blankToUndefined(input.agentName),
      signature: input.signature,
      signedAt,
      appointmentAt,
      attestationText: SOA_ATTESTATION,
      attestationVersion: DISCLOSURE_VERSION,
      ipHash: meta.ip ? hashIp(meta.ip) : null,
      userAgent: meta.userAgent?.slice(0, 500),
      retentionUntil,
    })
    .returning({ id: schema.soaSubmissions.id });

  return { id: row.id, signedAt, meetsFortyEightHourGuidance };
}
