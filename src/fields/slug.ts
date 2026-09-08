import type { Field } from "payload";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * URL slug, auto-derived from a source field on create but editable after —
 * so published URLs never silently change when a title is edited.
 */
export const slugField = (from = "title"): Field => ({
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: { position: "sidebar" },
  hooks: {
    beforeValidate: [
      ({ value, data, operation }) => {
        if (typeof value === "string" && value.length > 0)
          return slugify(value);
        const source = data?.[from];
        if (operation === "create" && typeof source === "string")
          return slugify(source);
        return value;
      },
    ],
  },
});
