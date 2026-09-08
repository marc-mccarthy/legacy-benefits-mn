import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";
import { slugField } from "@/fields/slug";

export const Team: CollectionConfig = {
  slug: "team",
  labels: { singular: "Team member", plural: "Team" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "role", "_status"],
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
    { name: "name", type: "text", required: true },
    slugField("name"),
    { name: "role", type: "text", required: true },
    { name: "headshot", type: "upload", relationTo: "media" },
    { name: "bio", type: "richText" },
    { name: "email", type: "email" },
    { name: "phone", type: "text" },
    { name: "linkedin", type: "text" },
    {
      name: "licenses",
      type: "array",
      admin: {
        description: "State licences or designations shown on the bio page.",
      },
      fields: [{ name: "label", type: "text", required: true }],
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
  ],
};
