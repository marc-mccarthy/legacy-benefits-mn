import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

const KEY = "NEXT_PUBLIC_SITE_URL";
let original: string | undefined;

beforeEach(() => {
  original = process.env[KEY];
});

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

describe("getSiteUrl", () => {
  it("returns the configured origin", () => {
    process.env[KEY] = "https://agency.example";
    expect(getSiteUrl()).toBe("https://agency.example");
  });

  it("strips a trailing slash", () => {
    process.env[KEY] = "https://agency.example/";
    expect(getSiteUrl()).toBe("https://agency.example");
  });

  it("strips repeated trailing slashes", () => {
    process.env[KEY] = "https://agency.example///";
    expect(getSiteUrl()).toBe("https://agency.example");
  });

  it("keeps a path prefix intact", () => {
    process.env[KEY] = "https://agency.example/site/";
    expect(getSiteUrl()).toBe("https://agency.example/site");
  });

  it("never returns a localhost origin when the variable is set", () => {
    process.env[KEY] = "https://d123.cloudfront.net";
    expect(getSiteUrl()).not.toContain("localhost");
    expect(getSiteUrl()).toBe("https://d123.cloudfront.net");
  });

  it("returns the placeholder when the variable is absent", () => {
    delete process.env[KEY];
    expect(getSiteUrl()).toBe("https://example.invalid");
  });

  it("treats a blank variable as absent", () => {
    process.env[KEY] = "   ";
    expect(getSiteUrl()).toBe("https://example.invalid");
  });

  it("is synchronous", () => {
    process.env[KEY] = "https://agency.example";
    expect(typeof getSiteUrl()).toBe("string");
  });
});
