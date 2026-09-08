import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";
import { slugField } from "@/fields/slug";

/**
 * The Learning Center. `type` reproduces the Article / Tool / Video badges
 * measured on greatwatersfinancial.com; `categories` drives the filter UI,
 * which is served by searchParams rather than a client-side list library.
 */
export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "publishedAt", "_status"],
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
      name: "type",
      type: "select",
      required: true,
      defaultValue: "article",
      index: true,
      options: [
        { label: "Article", value: "article" },
        { label: "Tool", value: "tool" },
        { label: "Video", value: "video" },
      ],
    },
    { name: "excerpt", type: "textarea", required: true },
    { name: "coverImage", type: "upload", relationTo: "media" },
    {
      name: "categories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true,
    },
    { name: "author", type: "relationship", relationTo: "team" },
    {
      name: "publishedAt",
      type: "date",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    { name: "body", type: "richText" },
  ],
};
