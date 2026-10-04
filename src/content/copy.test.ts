import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(import.meta.dirname, "..");
const SOLO_VOICE_BREAKERS =
  /\b(our team|our agents|our advisors|our staff|meet the team|people who answer|the licensed agents|Medicare Advisors)\b/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [path]
      : [];
  });
}

describe("one-voice copy", () => {
  it("never speaks of a team, staff or advisors", () => {
    const hits = ["content", "app", "components"]
      .flatMap((dir) => sourceFiles(join(srcRoot, dir)))
      .filter((file) => SOLO_VOICE_BREAKERS.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(srcRoot.length + 1));

    expect(hits).toEqual([]);
  });
});
