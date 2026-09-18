/**
 * Requirements:
 * - Catch diagram drift at the moment it is introduced, rather than whenever someone remembers.
 * - Cost nothing on a commit that touches neither the diagrams nor the modules they map.
 * - Never launch a browser: a commit hook is the wrong place for a renderer, and the rendering
 *   toolchain is not a dependency of this repository.
 *
 *   node scripts/check-diagrams-staged.mjs   # run from .husky/pre-commit
 *
 * Two independent kinds of drift, each with its own trigger, because they have different fixes:
 *
 *   a .mmd was edited          the committed .svg and .png still draw the previous version
 *                              fix: pnpm diagrams:render   (needs the renderer, see
 *                              scripts/generate-diagrams.mjs)
 *
 *   a server module moved      D5 is derived from the imports under src/lib and src/app/api, so
 *                              adding, deleting or re-importing a module makes the committed source
 *                              describe a wiring that no longer exists
 *                              fix: pnpm diagrams:derive   (offline, then re-render)
 *
 * The second trigger is why this watches src/ and not only docs/. A module added without being
 * placed in a group does not make the map WRONG in a way anyone would notice — it makes it
 * incomplete, which reads as complete. That is the failure worth blocking a commit over.
 *
 * Escape hatch, when the documentation is knowingly being fixed in a follow-up:
 *   git commit --no-verify
 */
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const staged = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  {
    encoding: "utf8",
    cwd: root,
  },
)
  .split("\n")
  .filter(Boolean);

if (staged.length === 0) process.exit(0);

const sourcesTouched = staged.some((path) =>
  /^docs\/diagrams\/.*\.mmd$/.test(path),
);
// Only the trees D5 is derived from. A change under src/components cannot move an edge on that map,
// and blocking a commit for it would train everyone to pass --no-verify.
const modulesTouched = staged.some((path) =>
  /^src\/(lib|app\/api)\//.test(path),
);

if (!sourcesTouched && !modulesTouched) process.exit(0);

let failed = false;

function run(script, label, fix) {
  const result = spawnSync(
    "node",
    [resolve(root, "scripts", script), "--check"],
    {
      stdio: "inherit",
      cwd: root,
    },
  );
  if (result.status !== 0) {
    console.error("");
    console.error(label);
    console.error(`  Fix:  ${fix}`);
    failed = true;
  }
}

if (modulesTouched) {
  run(
    "generate-derived-diagrams.mjs",
    "The derived module map no longer matches the imports in src/.",
    "pnpm diagrams:derive   (then re-render with: pnpm diagrams:render)",
  );
}

if (sourcesTouched) {
  run(
    "generate-diagrams.mjs",
    "A diagram source was edited without re-rendering its image.",
    "pnpm diagrams:render   (needs the mermaid-cli toolchain)",
  );
}

if (failed) {
  console.error("");
  console.error(
    "pre-commit blocked this commit. Bypass with: git commit --no-verify",
  );
  process.exit(1);
}

process.exit(0);
