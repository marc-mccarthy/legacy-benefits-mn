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

/**
 * Records a Scope of Appointment.
 *
 * Stored with the attestation text and version actually shown, because the
 * record must be reproducible on request for 10 years. Never queued to the
 * CRM: an SOA is a regulatory artefact, not a marketing lead.
 */
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
  // CMS expects the SOA at least 48 hours before the meeting where possible.
  // Recorded rather than enforced: same-day appointments are permitted in
  // defined circumstances, and blocking them here would be wrong.
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
