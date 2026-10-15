import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as prettier from "prettier";

const root = resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", cwd: root })
    .split("\n")
    .filter(Boolean);

const TARGETS = ["README.md", "CLAUDE.md", "AGENTS.md"];
const OPEN = /^<!-- generated:(\S+) -->$/;
const CLOSE = /^<!-- \/generated:(\S+) -->$/;
const PREFIXES = ["NEXT_PUBLIC_", "TF_VAR_"];

const tracked = git(["ls-files"]).filter((path) =>
  existsSync(resolve(root, path)),
);

function scriptsBlock() {
  const { scripts } = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  const rows = Object.entries(scripts).map(
    ([name, body]) =>
      `| \`pnpm ${name}\` | \`${body.replaceAll("|", "\\|")}\` |`,
  );
  return ["| Command | Runs |", "| --- | --- |", ...rows].join("\n");
}

function envGroup(key, firstSegments) {
  const prefix = PREFIXES.find((candidate) => key.startsWith(candidate));
  if (prefix) return prefix;
  const segment = key.split("_")[0];
  return key.includes("_") && firstSegments.get(segment) >= 2
    ? segment
    : "Other";
}

function envBlock() {
  const keys = readFileSync(resolve(root, "app.env"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")).trim());

  const firstSegments = new Map();
  for (const key of keys) {
    if (PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const segment = key.split("_")[0];
    firstSegments.set(segment, (firstSegments.get(segment) ?? 0) + 1);
  }

  const groups = new Map();
  for (const key of keys) {
    const group = envGroup(key, firstSegments);
    groups.set(group, [...(groups.get(group) ?? []), key]);
  }

  const rank = (group) =>
    PREFIXES.includes(group)
      ? PREFIXES.indexOf(group)
      : group === "Other"
        ? 3
        : 2;
  return [...groups.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((group) => {
      const names = groups
        .get(group)
        .sort()
        .map((key) => `\`${key}\``);
      return `- **${group}**: ${names.join(", ")}`;
    })
    .join("\n");
}

function layoutBlock() {
  const dirs = (prefix) =>
    [
      ...new Set(
        tracked
          .filter((path) => path.startsWith(prefix))
          .map((path) => path.slice(prefix.length))
          .filter((path) => path.includes("/"))
          .map((path) => path.split("/")[0]),
      ),
    ].sort();

  const lines = [];
  for (const folder of dirs("")) {
    lines.push(`${folder}/`);
    if (folder !== "src") continue;
    const children = dirs("src/");
    children.forEach((child, index) => {
      const branch = index === children.length - 1 ? "└──" : "├──";
      lines.push(`${branch} ${child}/`);
    });
  }
  return ["```text", ...lines, "```"].join("\n");
}

const GENERATORS = {
  scripts: scriptsBlock,
  env: envBlock,
  layout: layoutBlock,
};

function fail(file, line, message) {
  console.error(`${file}:${line}  ${message}`);
  process.exit(1);
}

function findBlocks(file, lines) {
  const blocks = [];
  let current = null;

  lines.forEach((text, index) => {
    const number = index + 1;
    const open = OPEN.exec(text);
    const close = CLOSE.exec(text);

    if (open) {
      if (current) fail(file, number, "generated block nested in another");
      const [, name] = open;
      if (!Object.hasOwn(GENERATORS, name)) {
        fail(file, number, `unknown generated block "${name}"`);
      }
      if (blocks.some((block) => block.name === name)) {
        fail(file, number, `generated:${name} appears more than once`);
      }
      current = { name, start: index, end: -1 };
      blocks.push(current);
    } else if (close) {
      if (!current || current.name !== close[1]) {
        fail(file, number, `closing marker for "${close[1]}" has no opener`);
      }
      current.end = index;
      current = null;
    }
  });

  if (current) {
    fail(file, current.start + 1, `generated:${current.name} is never closed`);
  }
  return blocks;
}

async function render(file, name) {
  const options = await prettier.resolveConfig(resolve(root, file));
  const body = await prettier.format(GENERATORS[name](), {
    ...options,
    parser: "markdown",
  });
  return `\n${body}`.split("\n");
}

async function processFile(file) {
  const original = readFileSync(resolve(root, file), "utf8");
  const lines = original.split("\n");
  const blocks = findBlocks(file, lines);
  const stale = [];

  for (const block of [...blocks].reverse()) {
    const body = await render(file, block.name);
    const current = lines.slice(block.start + 1, block.end);
    if (body.join("\n") === current.join("\n")) continue;
    stale.push(`${file}:${block.start + 1}  generated:${block.name} is stale`);
    lines.splice(block.start + 1, block.end - block.start - 1, ...body);
  }

  return {
    file,
    blocks: blocks.length,
    stale: stale.reverse(),
    text: lines.join("\n"),
  };
}

const results = [];
for (const file of TARGETS.filter((path) => tracked.includes(path))) {
  results.push(await processFile(file));
}

const total = results.reduce((sum, result) => sum + result.blocks, 0);
const stale = results.flatMap((result) => result.stale);

if (check) {
  if (stale.length > 0) {
    for (const line of stale) console.error(line);
    console.error(`\n${stale.length} stale generated block(s).`);
    process.exit(1);
  }
  console.log(`${total} generated block(s) up to date`);
} else {
  for (const result of results) {
    if (result.stale.length === 0) continue;
    writeFileSync(resolve(root, result.file), result.text);
    console.log(result.file);
  }
}
