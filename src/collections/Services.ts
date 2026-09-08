import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";
import { slugField } from "@/fields/slug";

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status"],
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
    {
      name: "summary",
      type: "textarea",
      required: true,
      admin: {
        description: "One or two sentences, shown on the service card.",
      },
    },
    { name: "icon", type: "text", admin: { description: "Lucide icon name." } },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "body", type: "richText" },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar", description: "Lower numbers sort first." },
    },
  ],
};
