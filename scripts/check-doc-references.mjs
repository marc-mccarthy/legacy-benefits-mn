import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", cwd: root })
    .split("\n")
    .filter(Boolean);

const scripts = new Set(
  Object.keys(
    JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts,
  ),
);

const PNPM_BUILTINS = new Set(
  `add audit bin config create dedupe deploy dlx doctor env exec fetch import init install licenses
   link list ls outdated pack patch prune publish rebuild remove root run server setup store unlink
   update why`.split(/\s+/),
);

const trackedRoots = new Set(
  git(["ls-files"]).map((path) => path.split("/")[0]),
);

const DOC = /^(docs\/)?[^/]+\.md$/;

const files = git(["ls-files", "*.md"]).filter(
  (path) => DOC.test(path) && existsSync(resolve(root, path)),
);

const findings = [];
const report = (file, line, reference, reason) =>
  findings.push({ file, line, reference, reason });

function candidatePath(token) {
  if (/\s/.test(token) || !token.includes("/")) return null;
  if (/^[/@~]|^https?:/.test(token)) return null;
  if (/[*{}<>]/.test(token)) return null;
  const path = token
    .replace(/:[A-Za-z_$][\w$]*$/, "")
    .replace(/:[\d,-]+$/, "")
    .replace(/\/+$/, "");
  if (!trackedRoots.has(path.split("/")[0])) return null;
  return path;
}

for (const file of files) {
  const lines = readFileSync(resolve(root, file), "utf8").split("\n");
  let fenced = false;

  lines.forEach((text, index) => {
    if (/^\s*```/.test(text)) fenced = !fenced;
    const number = index + 1;

    for (const [, run, name] of text.matchAll(
      /\bpnpm (run )?([a-z][\w:-]*)/g,
    )) {
      if (scripts.has(name)) continue;
      if (!run && PNPM_BUILTINS.has(name)) continue;
      report(file, number, `pnpm ${name}`, "no such script in package.json");
    }

    for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
      const path = candidatePath(token);
      if (path && !existsSync(resolve(root, path))) {
        report(file, number, token, "path does not exist");
      }
    }

    if (fenced) return;
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^([a-z]+:|[/#])/.test(target)) continue;
      const path = posix.normalize(
        posix.join(dirname(file), target.split("#")[0]),
      );
      if (!existsSync(resolve(root, path))) {
        report(file, number, target, "link target does not exist");
      }
    }
  });
}

if (findings.length > 0) {
  for (const { file, line, reference, reason } of findings) {
    console.error(`${file}:${line}  ${reference} — ${reason}`);
  }
  console.error(`\n${findings.length} stale reference(s) in documentation.`);
  process.exit(1);
}

console.log(`${files.length} markdown files checked, no stale references`);
