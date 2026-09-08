import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";
import { slugField } from "@/fields/slug";

/**
 * Mirrors the Events collection measured on greatwatersfinancial.com:
 * date, venue, a free/paid badge, and a registration link.
 */
export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startsAt", "venue", "_status"],
    group: "Content",
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: "title", type: "text", required: true },
    slugField(),
    { name: "summary", type: "textarea", required: true },
    {
      name: "startsAt",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "endsAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "venue", type: "text", required: true },
    { name: "address", type: "textarea" },
    {
      name: "cost",
      type: "select",
      required: true,
      defaultValue: "free",
      options: [
        { label: "Free", value: "free" },
        { label: "Paid", value: "paid" },
      ],
    },
    { name: "registrationUrl", type: "text" },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "body", type: "richText" },
  ],
};
