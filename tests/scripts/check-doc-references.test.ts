import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve(__dirname, "../../scripts/check-doc-references.mjs");
let dir: string;

function repoWith(doc: string, path = "README.md") {
  dir = mkdtempSync(join(tmpdir(), "doc-refs-"));
  mkdirSync(join(dir, "scripts"));
  mkdirSync(join(dir, "src"));
  copyFileSync(script, join(dir, "scripts", "check-doc-references.mjs"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ scripts: { build: "x" } }),
  );
  writeFileSync(join(dir, "src", "app.ts"), "");
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), doc);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["add", "."], { cwd: dir });
  return spawnSync("node", ["scripts/check-doc-references.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
}

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("check-doc-references", () => {
  it("accepts existing paths with line, range and list suffixes", () => {
    const run = repoWith(
      "`src/app.ts` `src/app.ts:19` `src/app.ts:1-9` `src/app.ts:1,3` `pnpm build`\n",
    );
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
  });

  it("reports a missing path even when it carries a line suffix", () => {
    const run = repoWith("`src/gone.ts:19`\n");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("src/gone.ts:19 — path does not exist");
  });

  it("checks docs/ at the top level but skips its subfolders", () => {
    expect(repoWith("`src/gone.ts`\n", "docs/guide.md").status).toBe(1);
    rmSync(dir, { recursive: true, force: true });
    expect(repoWith("`src/gone.ts`\n", "docs/plans/old.md").status).toBe(0);
  });

  it("reports a pnpm script that package.json does not define", () => {
    const run = repoWith("`pnpm nope`\n");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("pnpm nope — no such script in package.json");
  });
});
