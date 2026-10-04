import { media } from "./media";
import type { EventItem } from "./types";

const image = media["events.image"] ?? null;

const BODY =
  "Educational session. No plan-specific benefits are presented and no enrollment applications are accepted. Seating is limited, so let us know if you plan to attend.";

export const events: EventItem[] = [
  {
    id: "medicare-basics-workshop",
    slug: "medicare-basics-workshop",
    title: "Medicare Basics Workshop",
    summary:
      "A one-hour walk through the parts of Medicare, the enrollment windows, and the questions to ask.",
    startsAt: "2026-09-24T23:00:00.000Z",
    endsAt: "2026-09-25T00:30:00.000Z",
    venue: "Minneapolis Central Library",
    address: "300 Nicollet Mall, Minneapolis, MN 55401",
    cost: "free",
    registrationUrl: null,
    image,
    body: BODY,
  },
  {
    id: "turning-65-this-year",
    slug: "turning-65-this-year",
    title: "Turning 65 This Year? Start Here",
    summary:
      "What to do in the three months before your birthday month, and the deadlines that carry lifetime penalties.",
    startsAt: "2026-10-06T23:00:00.000Z",
    endsAt: "2026-10-07T00:30:00.000Z",
    venue: "Roseville Community Center",
    address: "2660 Civic Center Dr, Roseville, MN 55113",
    cost: "free",
    registrationUrl: null,
    image,
    body: BODY,
  },
  {
    id: "annual-enrollment-clinic",
    slug: "annual-enrollment-clinic",
    title: "Annual Enrollment Review Clinic",
    summary:
      "Bring your medication list and current plan. We will run the comparison with you, one on one.",
    startsAt: "2026-10-20T23:00:00.000Z",
    endsAt: "2026-10-21T00:30:00.000Z",
    venue: "Legacy Benefits Group Office",
    address: "1200 Nicollet Mall, Suite 400, Minneapolis, MN 55403",
    cost: "free",
    registrationUrl: null,
    image,
    body: BODY,
  },
  {
    id: "medicare-and-travel",
    slug: "medicare-and-travel",
    title: "Medicare & Travel: Coverage Away From Home",
    summary:
      "How networks behave when you spend part of the year elsewhere, and what Supplement plans change.",
    startsAt: "2026-11-04T00:00:00.000Z",
    endsAt: "2026-11-04T01:30:00.000Z",
    venue: "Edina Senior Center",
    address: "5280 Grandview Sq, Edina, MN 55436",
    cost: "free",
    registrationUrl: null,
    image,
    body: BODY,
  },
];

export function upcomingEvents(now: Date): EventItem[] {
  return events
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}

export function eventBySlug(slug: string): EventItem | undefined {
  return events.find((event) => event.slug === slug);
}
