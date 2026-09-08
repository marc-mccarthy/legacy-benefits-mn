import type { GlobalConfig } from "payload";
import { authenticated } from "@/access";

/**
 * Nav, footer, and the compliance surface every advisor site needs:
 * disclosures, a BrokerCheck link, and the client portal CTA (the pattern
 * measured on sapphirewealthllc.com and greatwatersfinancial.com).
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  admin: { group: "Settings" },
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: "nav",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
        {
          name: "children",
          type: "array",
          fields: [
            { name: "label", type: "text", required: true },
            { name: "href", type: "text", required: true },
            { name: "description", type: "text" },
          ],
        },
      ],
    },
    {
      name: "announcement",
      type: "group",
      admin: {
        description:
          "Thin bar above the header. Useful for enrollment windows — it shows only between the dates below, so it can be set once and left alone.",
      },
      fields: [
        { name: "enabled", type: "checkbox", defaultValue: false },
        { name: "text", type: "text" },
        { name: "linkLabel", type: "text" },
        { name: "linkHref", type: "text" },
        {
          name: "startsAt",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
        {
          name: "endsAt",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
      ],
    },
    {
      name: "stats",
      type: "array",
      maxRows: 4,
      admin: {
        description:
          "Trust band shown on the home page. Numbers count up when scrolled into view.",
      },
      fields: [
        { name: "value", type: "number", required: true },
        { name: "suffix", type: "text", admin: { description: "e.g. + or %" } },
        { name: "label", type: "text", required: true },
      ],
    },
    {
      name: "cta",
      type: "group",
      fields: [
        { name: "label", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "clientPortal",
      type: "group",
      admin: { description: "Shown as the LOG IN affordance in the header." },
      fields: [
        { name: "label", type: "text", defaultValue: "Client Portal" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "contact",
      type: "group",
      fields: [
        { name: "phone", type: "text" },
        { name: "email", type: "email" },
        { name: "address", type: "textarea" },
      ],
    },
    {
      name: "compliance",
      type: "group",
      admin: {
        description:
          "Medicare marketing disclosures. These feed the CMS-required footer block on every page — changes here are compliance changes.",
      },
      fields: [
        {
          name: "orgCount",
          type: "number",
          admin: {
            description:
              "Number of carriers/organizations you are appointed with in your service area. Used verbatim in the CMS TPMO disclaimer, so it must be accurate and updated when appointments change.",
          },
        },
        {
          name: "planCount",
          type: "number",
          admin: {
            description:
              "Number of products those organizations offer in your service area.",
          },
        },
        {
          name: "npn",
          type: "text",
          label: "National Producer Number (NPN)",
        },
        {
          name: "stateLicenses",
          type: "array",
          admin: { description: "States you are licensed to sell in." },
          fields: [
            { name: "state", type: "text", required: true },
            { name: "licenseNumber", type: "text" },
          ],
        },
        {
          name: "footerDisclosure",
          type: "textarea",
          admin: {
            description:
              "Any additional carrier-required or state-required language. Appended below the standard CMS disclosures.",
          },
        },
      ],
    },
    {
      name: "social",
      type: "array",
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          options: ["linkedin", "facebook", "youtube", "instagram"],
        },
        { name: "href", type: "text", required: true },
      ],
    },
  ],
};
