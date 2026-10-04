import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EventItem } from "@/content/types";
import { eventToIcs } from "./ics";

const KEY = "NEXT_PUBLIC_SITE_URL";
let original: string | undefined;

beforeEach(() => {
  original = process.env[KEY];
  process.env[KEY] = "https://agency.example";
});

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

const STAMP = new Date("2026-01-02T03:04:05.000Z");

function event(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "a",
    slug: "a-slug",
    title: "Workshop",
    summary: "Summary",
    startsAt: "2026-09-24T23:00:00.000Z",
    endsAt: "2026-09-25T00:30:00.000Z",
    venue: "Library",
    address: "300 Nicollet Mall, Minneapolis",
    cost: "free",
    registrationUrl: null,
    image: null,
    body: "",
    ...overrides,
  };
}

function ics(overrides: Partial<EventItem> = {}): string {
  return eventToIcs(event(overrides), "Agency", STAMP);
}

describe("eventToIcs", () => {
  it("emits the required calendar properties", () => {
    const out = ics();
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("VERSION:2.0");
    expect(out).toContain("PRODID:-//Agency//Events//EN");
    expect(out).toContain("UID:a-slug@agency.example");
    expect(out).toContain("DTSTAMP:20260102T030405Z");
    expect(out).toContain("DTSTART:20260924T230000Z");
    expect(out).toContain("DTEND:20260925T003000Z");
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("uses CRLF only", () => {
    expect(ics({ title: "a\nb" }).replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("defaults the end to one hour after the start", () => {
    expect(ics({ endsAt: null })).toContain("DTEND:20260925T000000Z");
  });

  it("prefers the address and falls back to the venue", () => {
    expect(ics()).toContain("LOCATION:300 Nicollet Mall\\, Minneapolis");
    expect(ics({ address: null })).toContain("LOCATION:Library");
  });

  it("adds URL only with a registration link", () => {
    expect(ics()).not.toContain("URL:");
    expect(ics({ registrationUrl: "https://x.example/r" })).toContain(
      "URL:https://x.example/r",
    );
  });

  it("escapes commas, semicolons, backslashes and newlines", () => {
    const out = ics({ title: "a,b;c\\d\ne\r\nf" });
    expect(out).toContain("SUMMARY:a\\,b\\;c\\\\d\\ne\\nf");
  });

  it("folds long lines at 75 octets, including multibyte characters", () => {
    const out = ics({ title: "x".repeat(200), summary: "é—".repeat(60) });
    for (const line of out.split("\r\n")) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
    const unfolded = out.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${"x".repeat(200)}`);
    expect(unfolded).toContain(`DESCRIPTION:${"é—".repeat(60)}`);
  });

  it("converts daylight and standard Central time to UTC", () => {
    const summer = new Date("2026-07-01T18:00:00-05:00").toISOString();
    expect(ics({ startsAt: summer, endsAt: null })).toContain(
      "DTSTART:20260701T230000Z",
    );
    const winter = new Date("2026-12-01T18:00:00-06:00").toISOString();
    expect(ics({ startsAt: winter, endsAt: null })).toContain(
      "DTSTART:20261202T000000Z",
    );
  });
});
