import type { SiteContent } from "./types";

export const site: SiteContent = {
  nav: [
    { label: "Services", href: "/services" },
    { label: "Events", href: "/events" },
    { label: "Learning Center", href: "/learn" },
    { label: "Meet Nate", href: "/team" },
    { label: "Contact", href: "/contact" },
  ],

  announcement: {
    enabled: true,
    text: "Medicare Annual Enrollment runs Oct 15 – Dec 7.",
    linkLabel: "Book your free review",
    linkHref: "/contact",
    startsAt: "2026-09-01T05:00:00.000Z",
    endsAt: "2026-12-07T06:00:00.000Z",
  },

  stats: [
    { value: 11, suffix: "", label: "Years helping Minnesotans" },
    { value: 1400, suffix: "+", label: "Clients served" },
    { value: 8, suffix: "", label: "Carriers represented" },
    { value: 3, suffix: "", label: "States licensed" },
  ],

  clientPortal: {
    label: "Client Portal",
    href: "https://www.medicareproapp.com/",
  },

  compliance: {
    orgCount: 8,
    planCount: 42,
    npn: "17742895",
    footerDisclosure: null,
    stateLicenses: [
      { state: "MN", licenseNumber: "40615592" },
      { state: "WI", licenseNumber: "18229104" },
      { state: "IA", licenseNumber: "1002418877" },
    ],
  },

  social: [],
};
