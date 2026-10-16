import { INTEREST_LABELS } from "../../../src/lib/leads/interest-labels";

export type RelayLead = {
  name: string;
  email: string;
  phone?: string;
  zip?: string;
  interest?: string;
  message?: string;
  sourcePath?: string;
  utm?: Record<string, string>;
  consentedAt: string;
  consentVersion: string;
};

export function splitName(name: string): {
  first: string;
  last: string | undefined;
} {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.length > 0 ? rest.join(" ") : undefined };
}

export function tenDigitPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

export function zip5(zip: string): string {
  return zip.slice(0, 5);
}

export function submissionDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPhone(phone: string): string {
  const d = tenDigitPhone(phone);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function utmLine(utm: Record<string, string> | undefined): string | undefined {
  const pairs = Object.entries(utm ?? {}).map(([k, v]) => `${k}=${v}`);
  return pairs.length > 0 ? `UTM: ${pairs.join(", ")}` : undefined;
}

function optionalLine(
  label: string,
  value: string | undefined,
): string | undefined {
  return value ? `${label}: ${value}` : undefined;
}

export function noteBody(
  lead: RelayLead,
  key: string,
  repeat: boolean,
): string {
  const date = submissionDate(lead.consentedAt);
  const lines = [
    repeat
      ? `Filled out the website form again on ${date}`
      : `Website form submission on ${date}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    optionalLine("Phone", lead.phone ? formatPhone(lead.phone) : undefined),
    optionalLine("ZIP", lead.zip),
    optionalLine(
      "Interested in",
      lead.interest ? (INTEREST_LABELS[lead.interest] ?? lead.interest) : "",
    ),
    optionalLine("Message", lead.message),
    optionalLine("Page", lead.sourcePath),
    utmLine(lead.utm),
    `TCPA consent: agreed ${lead.consentedAt}, disclosure version ${lead.consentVersion}`,
    `Ref: ${key}`,
  ];
  return lines.filter((line) => line !== undefined).join("\n");
}

export function individualForm(
  lead: RelayLead,
  key: string,
): Record<string, string | number> {
  const { first, last } = splitName(lead.name);
  return {
    indSource: 9,
    isLead: 1,
    indStatus: "Active Prospect",
    externalId: key,
    indFirstname: first,
    ...(last ? { indLastname: last } : {}),
    indEmailAddress: lead.email,
    ...(lead.phone ? { indPhoneNumber: tenDigitPhone(lead.phone) } : {}),
    ...(lead.zip ? { indAddressZip: zip5(lead.zip) } : {}),
    indNoteBody: noteBody(lead, key, false),
  };
}
