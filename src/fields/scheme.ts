import type { Field } from "payload";

/**
 * Selects which semantic token set a section band renders with. Emitted as
 * data-scheme on the section element; see [data-scheme] in globals.css.
 */
export const schemeField: Field = {
  name: "scheme",
  type: "select",
  required: true,
  defaultValue: "light",
  admin: { position: "sidebar" },
  options: [
    { label: "Light", value: "light" },
    { label: "Muted", value: "muted" },
    { label: "Dark", value: "dark" },
  ],
};

/** Appends the scheme selector to a block's own fields. */
export const withScheme = (fields: Field[]): Field[] => [
  ...fields,
  schemeField,
];
