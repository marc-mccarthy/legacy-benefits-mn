import { describe, expect, it } from "vitest";
import { slugField } from "./slug";

type HookArgs = {
  value?: unknown;
  data?: Record<string, unknown>;
  operation?: "create" | "update";
};

/** Runs the field's beforeValidate hook the way Payload would. */
function derive(args: HookArgs, from?: string) {
  const field = slugField(from) as unknown as {
    hooks: { beforeValidate: Array<(a: HookArgs) => unknown> };
  };
  return field.hooks.beforeValidate[0](args);
}

describe("field configuration", () => {
  it("is a required, unique, indexed text field in the sidebar", () => {
    // unique + index are what make a slug safe to resolve a page by.
    expect(slugField()).toMatchObject({
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar" },
    });
  });
});

describe("slugifying an explicit value", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["Hello, World!", "hello-world"],
    ["  Multiple   Spaces  ", "multiple-spaces"],
    ["snake_case_title", "snake-case-title"],
    ["--leading-and-trailing--", "leading-and-trailing"],
    ["already-a-slug", "already-a-slug"],
    ["Medicare Part D (2026)", "medicare-part-d-2026"],
    ["UPPERCASE", "uppercase"],
    ["a  --  b", "a-b"],
  ])("turns %j into %j", (input, expected) => {
    expect(derive({ value: input, operation: "update" })).toBe(expected);
  });

  it("normalises an editor's typed value on update too", () => {
    // Editors can rename a slug by hand; the result still has to be a slug.
    expect(derive({ value: "Some New Title", operation: "update" })).toBe(
      "some-new-title",
    );
  });
});

describe("deriving from the source field on create", () => {
  it("uses the title when no slug was typed", () => {
    expect(
      derive({ data: { title: "Understanding Part B" }, operation: "create" }),
    ).toBe("understanding-part-b");
  });

  it("reads a custom source field", () => {
    expect(
      derive({ data: { name: "Jane Doe" }, operation: "create" }, "name"),
    ).toBe("jane-doe");
  });

  it("prefers a typed slug over the title", () => {
    expect(
      derive({
        value: "custom-url",
        data: { title: "Understanding Part B" },
        operation: "create",
      }),
    ).toBe("custom-url");
  });
});

describe("published URLs survive a title edit", () => {
  it("does not re-derive the slug on update", () => {
    // The whole point of the create-only branch: renaming a title must not
    // silently change a live URL and break every inbound link to it.
    expect(
      derive({
        value: undefined,
        data: { title: "A Completely New Title" },
        operation: "update",
      }),
    ).toBeUndefined();
  });

  it("leaves an existing slug untouched when the title changes", () => {
    expect(
      derive({
        value: "original-slug",
        data: { title: "A Completely New Title" },
        operation: "update",
      }),
    ).toBe("original-slug");
  });
});

describe("cases with nothing to work from", () => {
  it("passes an empty string through to the source lookup", () => {
    // "" is not a usable slug, so it must not short-circuit the derivation.
    expect(
      derive({ value: "", data: { title: "From Title" }, operation: "create" }),
    ).toBe("from-title");
  });

  it("returns the value unchanged with no data at all", () => {
    expect(derive({ value: undefined, operation: "create" })).toBeUndefined();
  });

  it("returns the value unchanged when the source is missing", () => {
    expect(
      derive({ value: undefined, data: { other: "x" }, operation: "create" }),
    ).toBeUndefined();
  });

  it("ignores a non-string source", () => {
    expect(
      derive({ value: undefined, data: { title: 42 }, operation: "create" }),
    ).toBeUndefined();
  });

  it("ignores a non-string value", () => {
    expect(derive({ value: 42, operation: "update" })).toBe(42);
  });
});

describe("characters that do not survive slugification", () => {
  it("drops accents rather than transliterating them", () => {
    // WORTH KNOWING, not a defect for this site's English content: the
    // character class is \w, which is ASCII-only without the /u flag, so
    // accented letters are removed outright rather than folded to their base
    // letter. A Spanish-language article titled "Guía" would slug as "gua".
    // If translated content is ever added, this needs a transliteration step.
    expect(derive({ value: "Café", operation: "update" })).toBe("caf");
    expect(derive({ value: "Guía", operation: "update" })).toBe("gua");
  });

  it("drops emoji and punctuation entirely", () => {
    expect(derive({ value: "Medicare 🎉 Guide!", operation: "update" })).toBe(
      "medicare-guide",
    );
  });

  it("can reduce a title to an empty slug", () => {
    // A title of only non-ASCII characters yields "", which then fails the
    // field's own `required` rule — so the editor is told, rather than a
    // blank slug being saved.
    expect(derive({ value: "日本語", operation: "update" })).toBe("");
  });
});
