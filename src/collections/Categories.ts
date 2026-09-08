import type { CollectionConfig } from "payload";
import { authenticated } from "@/access";
import { slugField } from "@/fields/slug";

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: { useAsTitle: "title", group: "Content" },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [{ name: "title", type: "text", required: true }, slugField()],
};
