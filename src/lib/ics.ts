import type { EventItem } from "@/content/types";
import { getSiteUrl } from "@/lib/site-url";

const HOUR_MS = 3_600_000;
const MAX_OCTETS = 75;

function utc(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (octets + size > MAX_OCTETS) {
      lines.push(current);
      current = " ";
      octets = 1;
    }
    current += char;
    octets += size;
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function eventToIcs(
  event: EventItem,
  siteName: string,
  stamp: Date,
): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + HOUR_MS);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteName}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.slug}@${new URL(getSiteUrl()).hostname}`,
    `DTSTAMP:${utc(stamp)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.address ?? event.venue)}`,
    `DESCRIPTION:${escapeText(event.summary)}`,
  ];
  if (event.registrationUrl) lines.push(`URL:${event.registrationUrl}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(fold).join("\r\n") + "\r\n";
}
