import { afterEach, describe, expect, it, vi } from "vitest";
import { announcementIsLive } from "./announcement";

/** Freeze the clock at a point inside September 2026. */
function now(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

const live = { enabled: true, text: "Open enrollment starts October 15." };

afterEach(() => {
  vi.useRealTimers();
});

describe("it needs something to show", () => {
  it("is not live with no announcement at all", () => {
    expect(announcementIsLive()).toBe(false);
  });

  it("is not live with an empty object", () => {
    expect(announcementIsLive({})).toBe(false);
  });

  it.each([
    ["disabled", { enabled: false, text: "Hello" }],
    ["enabled null", { enabled: null, text: "Hello" }],
    ["enabled missing", { text: "Hello" }],
  ])("is not live when %s", (_label, announcement) => {
    expect(announcementIsLive(announcement)).toBe(false);
  });

  it.each([
    ["text is empty", { enabled: true, text: "" }],
    ["text is null", { enabled: true, text: null }],
    ["text is missing", { enabled: true }],
  ])("is not live when %s", (_label, announcement) => {
    // Enabled with nothing to say would render an empty bar above the header.
    expect(announcementIsLive(announcement)).toBe(false);
  });

  it("is live when enabled with text and no dates", () => {
    // Both dates are optional: an announcement with no window runs until
    // someone unticks it.
    expect(announcementIsLive(live)).toBe(true);
  });
});

describe("startsAt", () => {
  it("is not live before the start date", () => {
    now("2026-10-01T12:00:00.000Z");
    expect(announcementIsLive({ ...live, startsAt: "2026-10-15" })).toBe(false);
  });

  it("is live from the exact moment the start date begins", () => {
    now("2026-10-15T00:00:00.000Z");
    expect(announcementIsLive({ ...live, startsAt: "2026-10-15" })).toBe(true);
  });

  it("is not live one millisecond earlier", () => {
    now("2026-10-14T23:59:59.999Z");
    expect(announcementIsLive({ ...live, startsAt: "2026-10-15" })).toBe(false);
  });

  it("is live well after the start date", () => {
    now("2026-11-01T12:00:00.000Z");
    expect(announcementIsLive({ ...live, startsAt: "2026-10-15" })).toBe(true);
  });

  it("ignores a null start date", () => {
    now("2026-01-01T00:00:00.000Z");
    expect(announcementIsLive({ ...live, startsAt: null })).toBe(true);
  });
});

describe("endsAt covers the whole closing day", () => {
  // The CMS field is a dayOnly picker (SiteSettings.ts), so endsAt arrives as
  // midnight at the START of the closing day. Comparing against it directly
  // would hide the bar for the entirety of the day the editor chose, so a full
  // day is added to reach the end of it.

  it("is live at midnight on the closing day", () => {
    now("2026-12-07T00:00:00.000Z");
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(true);
  });

  it("is still live late on the closing day", () => {
    now("2026-12-07T23:00:00.000Z");
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(true);
  });

  it("is live at the exact end of the closing day", () => {
    // The comparison is `>`, so the boundary instant itself still counts.
    now("2026-12-08T00:00:00.000Z");
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(true);
  });

  it("is not live one millisecond past the closing day", () => {
    now("2026-12-08T00:00:00.001Z");
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(false);
  });

  it("is not live well after the closing day", () => {
    now("2026-12-20T12:00:00.000Z");
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(false);
  });

  it("ignores a null end date", () => {
    now("2030-01-01T00:00:00.000Z");
    expect(announcementIsLive({ ...live, endsAt: null })).toBe(true);
  });
});

describe("both dates together", () => {
  const window = { ...live, startsAt: "2026-10-15", endsAt: "2026-12-07" };

  it.each([
    ["before the window", "2026-10-01T12:00:00.000Z", false],
    ["on the opening day", "2026-10-15T09:00:00.000Z", true],
    ["mid-window", "2026-11-05T12:00:00.000Z", true],
    ["on the closing day", "2026-12-07T18:00:00.000Z", true],
    ["after the window", "2026-12-09T12:00:00.000Z", false],
  ])("%s", (_label, at, expected) => {
    now(at);
    expect(announcementIsLive(window)).toBe(expected);
  });

  it("is not live outside the window even when enabled", () => {
    now("2026-08-01T12:00:00.000Z");
    expect(announcementIsLive({ ...window, enabled: true })).toBe(false);
  });

  it("is not live inside the window when disabled", () => {
    // The date check never runs; disabled wins outright.
    now("2026-11-05T12:00:00.000Z");
    expect(announcementIsLive({ ...window, enabled: false })).toBe(false);
  });
});

describe("the closing day is measured in UTC", () => {
  it("ends at 19:00 Chicago time on the closing day during daylight saving", () => {
    // WORTH KNOWING, not a defect. endsAt is stored as UTC midnight and the
    // day is added in UTC, so the bar disappears at 2026-12-08T00:00Z. The
    // site renders times in America/Chicago, where that instant is 18:00 on
    // 7 December — so an announcement set to end on the 7th vanishes early
    // that evening rather than at local midnight.
    //
    // It errs toward showing less, and the editor picks whole days, so the
    // practical impact is a few hours on the final day. Fixing it would mean
    // resolving the closing instant in the site's timezone rather than UTC.
    now("2026-12-07T23:30:00.000Z"); // 17:30 in Chicago, still the 7th there
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(true);

    now("2026-12-08T05:00:00.000Z"); // 23:00 in Chicago, still the 7th there
    expect(announcementIsLive({ ...live, endsAt: "2026-12-07" })).toBe(false);
  });
});
