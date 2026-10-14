import "server-only";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

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
  html?: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  text,
  html,
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
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
            },
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

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

type LeadRow = { label: string; value: string; href?: string };

function leadRows(lead: LeadSummary): LeadRow[] {
  const rows: (LeadRow | null)[] = [
    { label: "Name", value: lead.name },
    { label: "Email", value: lead.email, href: `mailto:${lead.email}` },
    lead.phone
      ? {
          label: "Phone",
          value: lead.phone,
          href: `tel:${lead.phone.replace(/[^\d+]/g, "")}`,
        }
      : null,
    lead.zip ? { label: "ZIP code", value: lead.zip } : null,
    lead.interest
      ? {
          label: "Interested in",
          value: INTEREST_LABELS[lead.interest] ?? lead.interest,
        }
      : null,
    lead.sourcePath
      ? { label: "Sent from page", value: lead.sourcePath }
      : null,
  ];
  return rows.filter((row) => row !== null);
}

function leadText(lead: LeadSummary, rows: LeadRow[]): string {
  const width = Math.max(...rows.map((row) => row.label.length)) + 3;
  return [
    `New contact form from ${lead.name}`,
    "",
    ...rows.map((row) => `${`${row.label}:`.padEnd(width)}${row.value}`),
    "",
    "Message:",
    lead.message ?? "(no message)",
    "",
    `Reply to this email to answer ${lead.name} directly.`,
  ].join("\n");
}

function leadHtml(lead: LeadSummary, rows: LeadRow[]): string {
  const cell = "padding:10px 12px;border:1px solid #DDE2E8;";
  const body = rows
    .map((row) => {
      const value = escapeHtml(row.value);
      const shown = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color:#081A3A;">${value}</a>`
        : value;
      return `<tr><th align="left" style="${cell}background:#F7F9FA;width:35%;font-weight:600;">${row.label}</th><td style="${cell}">${shown}</td></tr>`;
    })
    .join("");
  const message = lead.message
    ? escapeHtml(lead.message)
    : '<span style="color:#5B6472;">(no message)</span>';
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#0A1128;max-width:600px;">',
    `<h1 style="font-size:20px;margin:0 0 16px;color:#081A3A;">New contact form from ${escapeHtml(lead.name)}</h1>`,
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">${body}</table>`,
    '<h2 style="font-size:16px;margin:24px 0 8px;color:#081A3A;">Message</h2>',
    `<p style="margin:0;white-space:pre-wrap;">${message}</p>`,
    `<p style="margin:24px 0 0;color:#5B6472;font-size:14px;">Reply to this email to answer ${escapeHtml(lead.name)} directly.</p>`,
    "</div>",
  ].join("");
}

export async function sendLeadNotification(
  lead: LeadSummary,
  business?: { name?: string; notificationEmails?: string[] },
) {
  const to = business?.notificationEmails?.length
    ? business.notificationEmails
    : (process.env["LEAD_NOTIFICATION_EMAILS"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const businessName =
    business?.name ?? process.env["BUSINESS_NAME"] ?? "Legacy Benefits Group";
  const rows = leadRows(lead);

  return sendEmail({
    to,
    replyTo: lead.email,
    subject: `${businessName} - Contact Form filled by ${lead.name}`,
    text: leadText(lead, rows),
    html: leadHtml(lead, rows),
  });
}

export async function sendLeadConfirmation(
  lead: LeadSummary,
  identity?: { name?: string; phone?: string },
) {
  const business =
    identity?.name ?? process.env["BUSINESS_NAME"] ?? "Legacy Benefits Group";
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
