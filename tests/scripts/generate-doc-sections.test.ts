import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");
const script = join(repoRoot, "scripts/generate-doc-sections.mjs");
const prettierBin = join(repoRoot, "node_modules/prettier/bin/prettier.cjs");
const SENTINEL = "sentinel-VALUE-9f3a1c";
const dirs: string[] = [];

const BLOCKS = ["scripts", "env", "layout"]
  .map((name) => `<!-- generated:${name} -->\n<!-- /generated:${name} -->`)
  .join("\n\nbetween blocks\n\n");
const DOC = `# Title\n\nIntro text.\n\n${BLOCKS}\n\nTail text.\n`;

const APP_ENV = [
  "# comment line",
  "",
  `NEXT_PUBLIC_SITE=${SENTINEL}`,
  `TF_VAR_region=${SENTINEL}`,
  `DB_HOST=${SENTINEL}`,
  `DB_PORT=${SENTINEL}`,
  `LONE_KEY=${SENTINEL}`,
  `PLAIN=${SENTINEL}`,
  "",
].join("\n");

const BASE_FILES: Record<string, string> = {
  "README.md": DOC,
  "package.json": JSON.stringify({
    scripts: { build: "next build", pipe: "a | b" },
  }),
  "app.env": APP_ENV,
  ".prettierrc.json": JSON.stringify({ semi: true, trailingComma: "all" }),
  "src/app/page.ts": "",
  "src/lib/util.ts": "",
  "docs/guide.md": "",
};

function repoWith(files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "doc-sections-"));
  dirs.push(dir);
  const all = { ...BASE_FILES, ...files };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  mkdirSync(join(dir, "scripts"));
  copyFileSync(script, join(dir, "scripts", "generate-doc-sections.mjs"));
  symlinkSync(join(repoRoot, "node_modules"), join(dir, "node_modules"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync(
    "git",
    ["add", "scripts/generate-doc-sections.mjs", ...Object.keys(all)],
    { cwd: dir },
  );
  return dir;
}

function run(dir: string, ...args: string[]) {
  return spawnSync("node", ["scripts/generate-doc-sections.mjs", ...args], {
    cwd: dir,
    encoding: "utf8",
  });
}

const read = (dir: string, path: string) =>
  readFileSync(join(dir, path), "utf8");

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("generate-doc-sections", () => {
  it("fills all three blocks and then passes --check", () => {
    const dir = repoWith();
    const write = run(dir);
    expect(write.stderr).toBe("");
    expect(write.status).toBe(0);
    expect(write.stdout).toBe("README.md\n");

    const doc = read(dir, "README.md");
    expect(doc).toContain("| Command      | Runs         |");
    expect(doc).toContain("| `pnpm build` | `next build` |");
    expect(doc).toContain("`a \\| b`");
    expect(doc).toContain("- **DB**: `DB_HOST`, `DB_PORT`");
    expect(doc).toContain("```text");

    const verify = run(dir, "--check");
    expect(verify.status).toBe(0);
    expect(verify.stdout).toBe("3 generated block(s) up to date\n");
  });

  it("keeps text outside the markers byte-identical", () => {
    const dir = repoWith();
    run(dir);
    const doc = read(dir, "README.md");
    expect(doc.startsWith("# Title\n\nIntro text.\n\n")).toBe(true);
    expect(doc).toContain("\n\nbetween blocks\n\n");
    expect(doc.endsWith("\n\nTail text.\n")).toBe(true);
  });

  it("reports a stale block with file:line and writes nothing in --check", () => {
    const dir = repoWith();
    run(dir);
    const edited = read(dir, "README.md").replace(
      "`next build`",
      "`next build --stale`",
    );
    writeFileSync(join(dir, "README.md"), edited);
    const line = edited.split("\n").indexOf("<!-- generated:scripts -->") + 1;

    const verify = run(dir, "--check");
    expect(verify.status).toBe(1);
    expect(verify.stderr).toContain(
      `README.md:${line}  generated:scripts is stale`,
    );
    expect(verify.stderr).not.toContain("generated:env");
    expect(read(dir, "README.md")).toBe(edited);
  });

  it("lists env key names only and never a value", () => {
    const dir = repoWith();
    const write = run(dir);
    const verify = run(dir, "--check");
    for (const output of [write.stdout, write.stderr, verify.stdout]) {
      expect(output).not.toContain(SENTINEL);
    }
    const doc = read(dir, "README.md");
    expect(doc).not.toContain(SENTINEL);
    expect(doc).toContain("`NEXT_PUBLIC_SITE`");
    expect(doc).not.toContain("comment line");
  });

  it("groups env keys by prefix with an Other bucket last", () => {
    const dir = repoWith();
    run(dir);
    const lines = read(dir, "README.md")
      .split("\n")
      .filter((line) => line.startsWith("- **"));
    expect(lines).toEqual([
      "- **NEXT_PUBLIC_**: `NEXT_PUBLIC_SITE`",
      "- **TF_VAR_**: `TF_VAR_region`",
      "- **DB**: `DB_HOST`, `DB_PORT`",
      "- **Other**: `LONE_KEY`, `PLAIN`",
    ]);
  });

  it("skips a folder whose only tracked file was deleted from disk", () => {
    const dir = repoWith({ "gone/only.ts": "" });
    rmSync(join(dir, "gone"), { recursive: true });
    const write = run(dir);
    expect(write.status).toBe(0);
    expect(read(dir, "README.md")).toContain(
      "```text\ndocs/\nscripts/\nsrc/\n├── app/\n└── lib/\n```",
    );
    expect(read(dir, "README.md")).not.toContain("gone/");
  });

  it.each([
    [
      "unknown block name",
      "a\n<!-- generated:bogus -->\n<!-- /generated:bogus -->\n",
      "README.md:2  unknown generated block",
    ],
    [
      "missing closing marker",
      "a\nb\n<!-- generated:env -->\ntext\n",
      "README.md:3  generated:env is never closed",
    ],
    [
      "duplicated block",
      "<!-- generated:env -->\n<!-- /generated:env -->\nx\n<!-- generated:env -->\n<!-- /generated:env -->\n",
      "README.md:4  generated:env appears more than once",
    ],
  ])("exits 1 with file:line on %s", (_name, doc, message) => {
    const dir = repoWith({ "README.md": doc });
    for (const args of [[], ["--check"]]) {
      const result = run(dir, ...args);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
    }
    expect(read(dir, "README.md")).toBe(doc);
  });

  it("processes a tracked AGENTS.md", () => {
    const dir = repoWith({
      "AGENTS.md": "<!-- generated:env -->\n<!-- /generated:env -->\n",
    });
    const write = run(dir);
    expect(write.stdout.split("\n")).toContain("AGENTS.md");
    expect(read(dir, "AGENTS.md")).toContain("`DB_HOST`");
  });

  it("ignores AGENTS.md when it is absent, deleted or untracked", () => {
    const absent = repoWith();
    expect(run(absent).status).toBe(0);

    const deleted = repoWith({
      "AGENTS.md": "<!-- generated:bogus -->\n<!-- /generated:bogus -->\n",
    });
    rmSync(join(deleted, "AGENTS.md"));
    expect(run(deleted).status).toBe(0);

    const untracked = repoWith();
    const doc = "<!-- generated:env -->\n<!-- /generated:env -->\n";
    writeFileSync(join(untracked, "AGENTS.md"), doc);
    const write = run(untracked);
    expect(write.status).toBe(0);
    expect(read(untracked, "AGENTS.md")).toBe(doc);
  });

  it("is a no-op on a second write run", () => {
    const dir = repoWith();
    run(dir);
    const first = read(dir, "README.md");
    const again = run(dir);
    expect(again.status).toBe(0);
    expect(again.stdout).toBe("");
    expect(read(dir, "README.md")).toBe(first);
  });

  it("writes output that prettier --check accepts", () => {
    const dir = repoWith();
    run(dir);
    const result = spawnSync("node", [prettierBin, "--check", "README.md"], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});
