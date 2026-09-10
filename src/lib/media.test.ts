import { describe, expect, it } from "vitest";
import { mediaProps } from "./media";

const doc = {
  url: "https://cdn.example.com/hero.jpg",
  alt: "An agent talking with a client",
  width: 2400,
  height: 1350,
};

describe("nothing to render", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("returns null for %s", (_label, media) => {
    expect(mediaProps(media)).toBeNull();
  });

  it("returns null for an unpopulated relationship id", () => {
    // Payload returns a bare id when the query depth did not reach this
    // relationship. Rendering is skipped rather than guessed at — if an image
    // silently fails to appear, the depth on the query is the thing to check.
    expect(mediaProps(42)).toBeNull();
  });

  it("returns null for an id of 0", () => {
    expect(mediaProps(0)).toBeNull();
  });

  it("returns null for a populated doc with no file", () => {
    // A Media row can exist before its upload finishes.
    expect(mediaProps({ alt: "no file yet" })).toBeNull();
  });

  it.each([
    ["null", null],
    ["an empty string", ""],
  ])("returns null when url is %s", (_label, url) => {
    expect(mediaProps({ ...doc, url })).toBeNull();
  });
});

describe("a fully populated document", () => {
  it("maps every field to next/image props", () => {
    expect(mediaProps(doc)).toEqual({
      src: "https://cdn.example.com/hero.jpg",
      alt: "An agent talking with a client",
      width: 2400,
      height: 1350,
    });
  });

  it("renames url to src", () => {
    // The whole point: components take next/image props and never branch on
    // Payload's shape.
    expect(mediaProps(doc)).not.toHaveProperty("url");
    expect(mediaProps(doc)?.src).toBe(doc.url);
  });

  it("works with a relative url", () => {
    expect(mediaProps({ ...doc, url: "/media/hero.jpg" })?.src).toBe(
      "/media/hero.jpg",
    );
  });
});

describe("alt text", () => {
  it("passes real alt text through", () => {
    expect(mediaProps(doc)?.alt).toBe("An agent talking with a client");
  });

  it.each([
    ["null", null],
    ["missing", undefined],
  ])("falls back to an empty string when alt is %s", (_label, alt) => {
    // A type-safety net rather than an accessibility decision: alt is
    // required: true on the Media collection, so a populated doc should always
    // carry one. If it does not, "" marks the image decorative, which is the
    // safer failure than rendering a filename to a screen reader.
    expect(mediaProps({ ...doc, alt })?.alt).toBe("");
  });

  it("preserves a deliberately empty alt", () => {
    // `??` not `||`, so an editor marking an image decorative is respected
    // rather than overwritten.
    expect(mediaProps({ ...doc, alt: "" })?.alt).toBe("");
  });
});

describe("dimension fallbacks", () => {
  it("defaults to 1600x900 when both are absent", () => {
    // next/image needs intrinsic dimensions to reserve layout space; 16:9 is
    // the least surprising guess for a marketing image.
    expect(mediaProps({ url: "/a.jpg" })).toMatchObject({
      width: 1600,
      height: 900,
    });
  });

  it.each([
    ["null", null],
    ["missing", undefined],
  ])("defaults width when it is %s", (_label, width) => {
    expect(mediaProps({ ...doc, width })?.width).toBe(1600);
  });

  it.each([
    ["null", null],
    ["missing", undefined],
  ])("defaults height when it is %s", (_label, height) => {
    expect(mediaProps({ ...doc, height })?.height).toBe(900);
  });

  it("falls back per dimension, not as a pair", () => {
    // A doc with only a width keeps it and defaults the other.
    expect(mediaProps({ url: "/a.jpg", width: 800 })).toMatchObject({
      width: 800,
      height: 900,
    });
  });

  it("keeps real dimensions rather than the defaults", () => {
    expect(mediaProps({ ...doc, width: 1600, height: 900 })).toMatchObject({
      width: 1600,
      height: 900,
    });
  });

  it("passes a zero dimension through unchanged", () => {
    // `??` treats 0 as a real value. next/image would reject it, but the
    // fallback is for absent data, not for correcting bad data — a zero-sized
    // upload is a problem to see, not to paper over.
    expect(mediaProps({ ...doc, width: 0 })?.width).toBe(0);
  });
});
