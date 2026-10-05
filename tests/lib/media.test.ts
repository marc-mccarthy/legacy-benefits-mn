import { describe, expect, it } from "vitest";
import { mediaProps } from "@/lib/media";

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
    expect(mediaProps(42)).toBeNull();
  });

  it("returns null for an id of 0", () => {
    expect(mediaProps(0)).toBeNull();
  });

  it("returns null for a populated doc with no file", () => {
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
    expect(mediaProps({ ...doc, alt })?.alt).toBe("");
  });

  it("preserves a deliberately empty alt", () => {
    expect(mediaProps({ ...doc, alt: "" })?.alt).toBe("");
  });
});

describe("dimension fallbacks", () => {
  it("defaults to 1600x900 when both are absent", () => {
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
    expect(mediaProps({ ...doc, width: 0 })?.width).toBe(0);
  });
});
