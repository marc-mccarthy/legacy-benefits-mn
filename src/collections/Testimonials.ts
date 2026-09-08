import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  admin: {
    useAsTitle: "author",
    defaultColumns: ["author", "location", "_status"],
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
    {
      name: "quote",
      type: "textarea",
      required: true,
      admin: {
        description:
          "Use the client's own words. Keep it short — two or three sentences reads better than a paragraph.",
      },
    },
    {
      name: "author",
      type: "text",
      required: true,
      admin: { description: "First name and last initial is usually enough." },
    },
    {
      name: "location",
      type: "text",
      admin: { description: "e.g. Roseville, MN" },
    },
    { name: "photo", type: "upload", relationTo: "media" },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
  ],
};
