import { describe, expect, it } from "vitest";
import { initialsOf } from "@/components/ui/monogram";

describe("initialsOf", () => {
  it("takes the first and last initial", () => {
    expect(initialsOf("Nate Bergstrom")).toBe("NB");
  });

  it("skips middle names rather than stacking every initial", () => {
    expect(initialsOf("Nate Van Der Berg")).toBe("NB");
  });

  it("uses a single letter for a mononym", () => {
    expect(initialsOf("Cher")).toBe("C");
  });

  it("normalises casing", () => {
    expect(initialsOf("nate bergstrom")).toBe("NB");
  });

  it("tolerates surrounding and repeated whitespace", () => {
    expect(initialsOf("  Nate   Bergstrom  ")).toBe("NB");
  });

  it("keeps accented letters intact", () => {
    expect(initialsOf("Ángela Ortiz")).toBe("ÁO");
  });

  it("takes whole code points, not half a surrogate pair", () => {
    expect(initialsOf("𝒩ate Bergstrom")).toBe("𝒩B");
  });

  it("ignores tokens that carry no letters", () => {
    expect(initialsOf("Nate - Bergstrom")).toBe("NB");
  });

  it("falls back to a placeholder rather than rendering an empty circle", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
    expect(initialsOf("- -")).toBe("?");
  });
});
