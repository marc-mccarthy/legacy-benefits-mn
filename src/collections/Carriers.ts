import type { CollectionConfig } from "payload";
import { authenticated } from "@/access";

/**
 * Carrier logos for the trust strip.
 *
 * Carriers usually have co-marketing rules about how their marks may be shown,
 * so `approved` gates display rather than deleting the record.
 */
export const Carriers: CollectionConfig = {
  slug: "carriers",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "approved"],
    group: "Content",
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "logo", type: "upload", relationTo: "media" },
    {
      name: "approved",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Only tick once the carrier's co-marketing guidelines allow their logo on this site.",
      },
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
  ],
};
