import "server-only";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * Transactional email via SES.
 *
 * Credentials come from the ECS task role — there are no access keys here. If
 * SES_FROM_ADDRESS is unset (local dev, CI) sending is skipped and logged
 * instead, so nothing needs AWS to run.
 *
 * Every send is best-effort: a lead is already committed to Postgres before
 * this runs, so a mail failure must never turn into a failed submission for
 * the visitor.
 */

let client: SESv2Client | undefined;

function getClient(): SESv2Client {
  client ??= new SESv2Client({
    region: process.env["AWS_REGION"] ?? "us-east-1",
  });
  return client;
}

type Email = {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: Email): Promise<{ sent: boolean; reason?: string }> {
  const from = process.env["SES_FROM_ADDRESS"];

  if (!from) {
    console.info(
      `[email] skipped (no SES_FROM_ADDRESS): "${subject}" -> ${to.join(", ")}`,
    );
    return { sent: false, reason: "not-configured" };
  }
  if (to.length === 0) return { sent: false, reason: "no-recipients" };

  try {
    await getClient().send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: to },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Text: { Data: text, Charset: "UTF-8" } },
          },
        },
      }),
    );
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false, reason: "send-failed" };
  }
}

type LeadSummary = {
  name: string;
  email: string;
  phone?: string;
  zip?: string;
  interest?: string;
  message?: string;
  sourcePath?: string;
};

const INTEREST_LABELS: Record<string, string> = {
  "medicare-advantage": "Medicare Advantage (Part C)",
  supplement: "Medicare Supplement (Medigap)",
  "part-d": "Prescription drug coverage (Part D)",
  life: "Life insurance",
  other: "Something else",
};

/** Tells the agency a lead arrived. Reply-to is the lead, so hitting reply works. */
export async function sendLeadNotification(
  lead: LeadSummary,
  business?: { name?: string; notificationEmails?: string[] },
) {
  // Recipients come from site settings so they can be changed without a
  // redeploy; the env var is only a fallback.
  const to = business?.notificationEmails?.length
    ? business.notificationEmails
    : (process.env["LEAD_NOTIFICATION_EMAILS"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return sendEmail({
    to,
    replyTo: lead.email,
    subject: `New website lead: ${lead.name}`,
    text: [
      `${lead.name} requested a call.`,
      "",
      `Email:    ${lead.email}`,
      lead.phone ? `Phone:    ${lead.phone}` : null,
      lead.zip ? `ZIP:      ${lead.zip}` : null,
      lead.interest
        ? `Interest: ${INTEREST_LABELS[lead.interest] ?? lead.interest}`
        : null,
      lead.sourcePath ? `Page:     ${lead.sourcePath}` : null,
      "",
      lead.message ? `Message:\n${lead.message}` : "(no message)",
      "",
      "This lead is saved and queued to MedicarePRO.",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}

/** Confirms to the visitor that a human has their request. */
export async function sendLeadConfirmation(
  lead: LeadSummary,
  identity?: { name?: string; phone?: string },
) {
  const business = identity?.name ?? process.env["BUSINESS_NAME"] ?? "our team";
  const phone = identity?.phone ?? process.env["BUSINESS_PHONE"];

  return sendEmail({
    to: [lead.email],
    subject: `We got your request — ${business}`,
    text: [
      `Hi ${lead.name.split(" ")[0]},`,
      "",
      `Thanks for reaching out. A licensed agent at ${business} will contact you shortly.`,
      phone ? `If you need us sooner, call ${phone} (TTY 711).` : null,
      "",
      "There is no cost for a review, and no obligation to enrol in anything.",
      "",
      "If you did not fill in a form on our website, reply to this message and we will remove your details.",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}
