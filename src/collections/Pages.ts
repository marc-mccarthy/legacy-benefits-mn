import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated } from "@/access";
import { slugField } from "@/fields/slug";
import { withScheme } from "@/fields/scheme";

/**
 * Block-based page builder. Each block maps 1:1 to a section component in
 * src/components/sections, and `scheme` selects the semantic token set the
 * band renders with (see [data-scheme] in globals.css).
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status"],
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
      name: "layout",
      type: "blocks",
      admin: { initCollapsed: true },
      blocks: [
        {
          slug: "hero",
          fields: withScheme([
            { name: "heading", type: "text", required: true },
            { name: "subheading", type: "textarea" },
            { name: "video", type: "upload", relationTo: "media" },
            { name: "poster", type: "upload", relationTo: "media" },
            { name: "ctaLabel", type: "text" },
            { name: "ctaHref", type: "text" },
          ]),
        },
        {
          slug: "richText",
          fields: withScheme([
            { name: "content", type: "richText", required: true },
          ]),
        },
        {
          slug: "serviceGrid",
          fields: withScheme([
            { name: "heading", type: "text" },
            { name: "intro", type: "textarea" },
          ]),
        },
        {
          slug: "eventCarousel",
          fields: withScheme([{ name: "heading", type: "text" }]),
        },
        {
          slug: "learningGrid",
          fields: withScheme([
            { name: "heading", type: "text" },
            { name: "intro", type: "textarea" },
          ]),
        },
        {
          slug: "stats",
          labels: { singular: "Stats band", plural: "Stats bands" },
          fields: withScheme([]),
        },
        {
          slug: "testimonials",
          fields: withScheme([{ name: "heading", type: "text" }]),
        },
        {
          slug: "carrierStrip",
          labels: { singular: "Carrier strip", plural: "Carrier strips" },
          fields: withScheme([{ name: "heading", type: "text" }]),
        },
        {
          slug: "faq",
          fields: withScheme([
            { name: "heading", type: "text" },
            {
              name: "items",
              type: "array",
              minRows: 1,
              fields: [
                { name: "question", type: "text", required: true },
                { name: "answer", type: "richText", required: true },
              ],
            },
          ]),
        },
        {
          slug: "ctaBand",
          fields: withScheme([
            { name: "heading", type: "text", required: true },
            { name: "body", type: "textarea" },
            { name: "ctaLabel", type: "text" },
            { name: "ctaHref", type: "text" },
          ]),
        },
      ],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "image", type: "upload", relationTo: "media" },
      ],
    },
  ],
};
