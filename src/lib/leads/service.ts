import { createHash, randomUUID } from "crypto";
import { db, schema } from "@/lib/db";
import {
  DISCLOSURE_VERSION,
  RECORD_RETENTION_YEARS,
  tcpaConsentText,
} from "@/lib/compliance/disclosures";
import { isSuppressed } from "@/lib/compliance/suppression";
import { blankToUndefined, type LeadInput } from "./schema";

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}${process.env["PAYLOAD_SECRET"] ?? ""}`)
    .digest("hex");
}

function retentionDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + RECORD_RETENTION_YEARS);
  return d;
}

/**
 * Writes the lead and its outbox entry in a single transaction. Delivery to
 * MedicarePRO happens later, out of band — the visitor's request never waits
 * on the CRM, and a CRM outage cannot cost a lead.
 *
 * The TCPA consent text is regenerated here on the server rather than accepted
 * from the request body. A consent record the submitter could edit would be
 * worthless as evidence.
 */
export async function captureLead(
  input: LeadInput,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ leadId: number; suppressed: boolean }> {
  const ipHash = meta.ip ? hashIp(meta.ip) : null;
  // Someone who previously revoked contact is never auto-pushed to the CRM.
  const suppressed = await isSuppressed(input.email, input.phone);
  const businessName = process.env["BUSINESS_NAME"] ?? "this agency";
  const businessPhone = process.env["BUSINESS_PHONE"];
  const consentText = tcpaConsentText(businessName, businessPhone);

  return db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(schema.leads)
      .values({
        name: input.name,
        email: input.email,
        phone: blankToUndefined(input.phone),
        zip: blankToUndefined(input.zip),
        interest: blankToUndefined(input.interest),
        message: blankToUndefined(input.message),
        sourcePath: blankToUndefined(input.sourcePath),
        utm: input.utm,
        consentedAt: new Date(),
        consentText,
        consentVersion: DISCLOSURE_VERSION,
        userAgent: meta.userAgent?.slice(0, 500),
        ipHash,
        retentionUntil: retentionDate(),
      })
      .returning({ id: schema.leads.id });

    if (suppressed) return { leadId: lead.id, suppressed };

    await tx.insert(schema.crmOutbox).values({
      leadId: lead.id,
      idempotencyKey: randomUUID(),
      payload: {
        name: input.name,
        email: input.email,
        phone: blankToUndefined(input.phone),
        zip: blankToUndefined(input.zip),
        interest: blankToUndefined(input.interest),
        message: blankToUndefined(input.message),
        sourcePath: blankToUndefined(input.sourcePath),
        utm: input.utm,
        consentedAt: new Date().toISOString(),
        consentVersion: DISCLOSURE_VERSION,
      },
    });

    return { leadId: lead.id, suppressed };
  });
}
