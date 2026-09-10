import { describe, expect, it } from "vitest";
import type { Field } from "payload";
import { schemeField, withScheme } from "./scheme";

describe("schemeField", () => {
  it("is a required sidebar select defaulting to light", () => {
    expect(schemeField).toMatchObject({
      name: "scheme",
      type: "select",
      required: true,
      defaultValue: "light",
      admin: { position: "sidebar" },
    });
  });

  it("offers exactly the three token sets defined in globals.css", () => {
    // These values are emitted as data-scheme and matched by [data-scheme] in
    // globals.css; a fourth option here would render unstyled.
    expect(schemeField).toMatchObject({
      options: [
        { label: "Light", value: "light" },
        { label: "Muted", value: "muted" },
        { label: "Dark", value: "dark" },
      ],
    });
  });

  it("defaults to a value that is one of its own options", () => {
    const field = schemeField as Extract<Field, { options: unknown }>;
    const values = (field.options as Array<{ value: string }>).map(
      (o) => o.value,
    );

    expect(values).toContain("light");
  });
});

describe("withScheme", () => {
  const title: Field = { name: "title", type: "text" };
  const body: Field = { name: "body", type: "textarea" };

  it("appends the scheme selector after a block's own fields", () => {
    expect(withScheme([title, body])).toEqual([title, body, schemeField]);
  });

  it("keeps the block's fields in their original order", () => {
    const result = withScheme([title, body]);

    // Field order is the admin form's order, so this is editor-facing.
    expect(result[0]).toBe(title);
    expect(result[1]).toBe(body);
  });

  it("works for a block with no fields of its own", () => {
    expect(withScheme([])).toEqual([schemeField]);
  });

  it("does not mutate the array it was given", () => {
    const fields = [title];

    withScheme(fields);

    expect(fields).toEqual([title]);
    expect(fields).toHaveLength(1);
  });

  it("returns a new array each call", () => {
    const fields = [title];
    expect(withScheme(fields)).not.toBe(withScheme(fields));
  });
});
