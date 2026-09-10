import { describe, expect, it } from "vitest";
import { authenticated, publishedOrAuthenticated } from "./index";

/** Payload hands access functions the whole request; only `user` is read. */
function args(user: unknown) {
  return { req: { user } } as unknown as Parameters<typeof authenticated>[0];
}

const editor = { id: 1, email: "editor@agency.example" };

describe("publishedOrAuthenticated", () => {
  it("lets a signed-in editor read everything", async () => {
    // Editors need to see their own drafts to work on them.
    expect(await publishedOrAuthenticated(args(editor))).toBe(true);
  });

  it("restricts anonymous readers to published documents", async () => {
    // Returning a filter rather than false is what makes drafts invisible
    // instead of making the whole collection unreadable.
    expect(await publishedOrAuthenticated(args(undefined))).toEqual({
      _status: { equals: "published" },
    });
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("treats a %s user as anonymous", async (_label, user) => {
    const result = await publishedOrAuthenticated(args(user));

    // Never `true` for an unauthenticated caller — that would publish every
    // draft on the site.
    expect(result).not.toBe(true);
    expect(result).toEqual({ _status: { equals: "published" } });
  });

  it("never returns false, which would hide published content too", async () => {
    expect(await publishedOrAuthenticated(args(undefined))).not.toBe(false);
  });
});

describe("authenticated", () => {
  it("admits a signed-in user", async () => {
    expect(await authenticated(args(editor))).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("refuses a %s user", async (_label, user) => {
    expect(await authenticated(args(user))).toBe(false);
  });

  it("returns a boolean rather than the user object", async () => {
    // A truthy object would satisfy Payload but leak the user into any code
    // that logs the access result.
    expect(await authenticated(args(editor))).toBe(true);
    expect(typeof (await authenticated(args(editor)))).toBe("boolean");
  });
});
