import "server-only";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { CMIP_DESIGNATION_NOTICE } from "@/lib/compliance/disclosures";

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
  consent?: boolean;
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

const NOT_PROVIDED = "Not provided";

function leadRows(lead: LeadSummary): LeadRow[] {
  return [
    { label: "Name", value: lead.name },
    { label: "Email", value: lead.email, href: `mailto:${lead.email}` },
    lead.phone
      ? {
          label: "Phone",
          value: lead.phone,
          href: `tel:${lead.phone.replace(/[^\d+]/g, "")}`,
        }
      : { label: "Phone", value: NOT_PROVIDED },
    { label: "ZIP code", value: lead.zip || NOT_PROVIDED },
    {
      label: "Interested in",
      value: lead.interest
        ? (INTEREST_LABELS[lead.interest] ?? lead.interest)
        : NOT_PROVIDED,
    },
    {
      label: "Consent to contact",
      value: lead.consent ? "Yes" : "Not recorded",
    },
  ];
}

function leadText(lead: LeadSummary, rows: LeadRow[]): string {
  const width = Math.max(...rows.map((row) => row.label.length)) + 3;
  return [
    `New contact form from ${lead.name}`,
    "",
    ...rows.map((row) => `${`${row.label}:`.padEnd(width)}${row.value}`),
    "",
    "Message:",
    lead.message || "(no message)",
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
    : (process.env["LEAD_NOTIFICATION_EMAIL"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const businessName =
    business?.name ?? process.env["BUSINESS_NAME"] ?? "Legacy Benefits Group";
  const rows = leadRows(lead);

  return sendEmail({
    to,
    replyTo: lead.email,
    subject: `${businessName} - New Lead: ${lead.name}`,
    text: leadText(lead, rows),
    html: leadHtml(lead, rows),
  });
}

const SIGNATURE = {
  name: "Nate Best, CMIP®",
  title: "Certified Medicare Insurance Planner™",
  company: "Legacy Benefits Group, LLC.",
  email: "Nbest@legacybenefitsmn.com",
};

const SIGNATURE_MEDICARE_NOTICE =
  "We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all your options.";

function dashedPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^1/, "");
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;
}

function signatureText(phone?: string): string[] {
  return [
    SIGNATURE.name,
    SIGNATURE.title,
    SIGNATURE.company,
    ...(phone ? [dashedPhone(phone)] : []),
    SIGNATURE.email,
    "",
    SIGNATURE_MEDICARE_NOTICE,
    "",
    CMIP_DESIGNATION_NOTICE,
  ];
}

function signatureHtml(phone?: string): string {
  const fine =
    "margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;font-style:italic;color:#8a8a8a;";
  const medicare = escapeHtml(SIGNATURE_MEDICARE_NOTICE)
    .replace(
      "Medicare.gov",
      '<a href="https://www.medicare.gov/" style="color:#2a85e8;">Medicare.gov</a>',
    )
    .replace("1-800-MEDICARE", '<b style="color:#000000;">1-800-MEDICARE</b>');
  const phoneLine = phone
    ? `<div><a href="tel:+1${phone.replace(/\D/g, "").replace(/^1/, "")}" style="color:#1155cc;">${escapeHtml(dashedPhone(phone))}</a></div>`
    : "";
  return [
    '<div style="margin-top:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#222222;">',
    `<div><b>${escapeHtml(SIGNATURE.name)}</b></div>`,
    `<div><i>${escapeHtml(SIGNATURE.title)}</i></div>`,
    `<div>${escapeHtml(SIGNATURE.company)}</div>`,
    phoneLine,
    `<div><a href="mailto:${SIGNATURE.email}" style="color:#1155cc;">${SIGNATURE.email}</a></div>`,
    `<p style="${fine}">${medicare}</p>`,
    `<p style="${fine}">${escapeHtml(CMIP_DESIGNATION_NOTICE)}</p>`,
    "</div>",
  ].join("");
}

export async function sendLeadConfirmation(
  lead: LeadSummary,
  identity?: { name?: string; phone?: string },
) {
  const business =
    identity?.name ?? process.env["BUSINESS_NAME"] ?? "Legacy Benefits Group";
  const phone = identity?.phone ?? process.env["BUSINESS_PHONE"];
  const firstName = lead.name.split(" ")[0]!;
  const removal =
    "If you did not fill in a form on our website, reply to this message and we will remove your details.";
  const body = (p: string) => `<p style="margin:0 0 16px;">${p}</p>`;

  return sendEmail({
    to: [lead.email],
    subject: `We got your request — ${business}`,
    text: [
      `Hi ${firstName},`,
      "",
      `Thank you for reaching out to ${business}. Nate Best, CMIP®, will call you soon.`,
      phone
        ? `Need help sooner? Call ${phone} (TTY 711) and ask for Nate.`
        : null,
      "",
      "There is no cost for a review, and no obligation to enroll in anything.",
      "",
      removal,
      "",
      ...signatureText(phone),
    ]
      .filter((line) => line !== null)
      .join("\n"),
    html: [
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#0A1128;max-width:600px;">',
      body(`Hi ${escapeHtml(firstName)},`),
      body(
        `Thank you for reaching out to ${escapeHtml(business)}. <b>Nate Best, CMIP®</b>, will call you soon.`,
      ),
      phone
        ? body(
            `Need help sooner? Call <a href="tel:+1${phone.replace(/\D/g, "").replace(/^1/, "")}" style="color:#081A3A;font-weight:bold;">${escapeHtml(phone)}</a> (TTY 711) and ask for Nate.`,
          )
        : "",
      body(
        "There is no cost for a review, and no obligation to enroll in anything.",
      ),
      `<p style="margin:0;font-size:16px;color:#5B6472;">${removal}</p>`,
      signatureHtml(phone),
      "</div>",
    ].join(""),
  });
}
