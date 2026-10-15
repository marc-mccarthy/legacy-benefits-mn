# Docs automation

Created: 2026-10-15 · Updated: 2026-10-15

## Source

- hash: 157e0bc9

Every commit leaves the repo's docs and diagrams correct. In scope: root README.md, CLAUDE.md, AGENTS.md (only if it exists), top-level docs/*.md (not subfolders) and docs/diagrams. Lefthook pre-commit has a FIX step that regenerates every derivable doc section and diagram and stages it, then a VERIFY step that fails if anything is stale; CI runs the same checks. Already done: scripts/check-doc-references.mjs (`pnpm docs:check`), `pnpm diagrams:build` and `diagrams:check`, both wired into lefthook verify and CI. Remaining: (1) scripts/generate-doc-sections.mjs with --check, exposed as `pnpm docs:generate`, rewriting marker-delimited blocks in README.md / CLAUDE.md for a scripts table, an env key list (names only) and the repo layout, replacing the hand-written equivalents, with tests in tests/scripts/; (2) lefthook.yml fix-group generators with stage_fixed, checks kept in verify, pre-push and verify-all, ci.yml runs the check modes; (3) `pnpm docs:sync` running scripts/docs-sync.sh, an on-demand `claude -p` pass over the diff vs main, not in any hook; (4) one short README section. Non-goals: AI in hooks, checking docs subfolders other than diagrams, editing docs/plans.

## Budget

- model: sonnet
- model_id: claude-sonnet-5-5
- model_source: forced-env
- effort: high
- window: 1000000
- budget_tokens: 500000
- overhead: 30000

## Expertise map

- Node ESM build scripts, prettier API, vitest → mj-baton:executor
- lefthook, GitHub Actions → mj-baton:architect (skill: ci-cd-and-automation)
- Bash, shellcheck, Claude Code CLI flags → mj-baton:executor
- Markdown docs → mj-baton:executor
- Cross-file verification → general-purpose

## Traceability

- Generator `scripts/generate-doc-sections.mjs` with `--check`, `pnpm docs:generate`, marker blocks for scripts, env keys, layout → T1
- Tests in tests/scripts/ in the temp-repo style → T2
- Replace hand-written README equivalents with generated blocks → T3
- lefthook fix-group generators with stage_fixed; checks stay in verify, pre-push, verify-all; ci.yml runs check modes → T4
- `pnpm docs:sync` and `scripts/docs-sync.sh` (bash, shellcheck clean, claude -p over the diff, not in any hook) → T5
- Mention all of it briefly in README.md → T6
- Every commit leaves docs and diagrams correct (end to end) → V

## Tasks

- [x] T1 — Doc section generator (est. 116k / budget 500k · agent: mj-baton:executor · skills: incremental-implementation)
  - objective: Create `scripts/generate-doc-sections.mjs` (ESM, style of scripts/check-doc-references.mjs) and add `"docs:generate": "node scripts/generate-doc-sections.mjs"` to package.json. Change `docs:check` to `node scripts/check-doc-references.mjs && node scripts/generate-doc-sections.mjs --check` so the existing lefthook verify, pre-push, verify-all and ci.yml calls pick it up unchanged. Design, fixed: targets are README.md, CLAUDE.md and AGENTS.md, only those tracked and present (`git ls-files` plus `existsSync`, because unstaged deletions stay in the index). A block is `<!-- generated:NAME -->` … `<!-- /generated:NAME -->`; NAME is one of `scripts`, `env`, `layout`. An unknown name, a missing or duplicated closing marker, or nested markers exit 1 with `file:line` on stderr. Write mode replaces each block body in place, leaves everything outside the markers byte-identical, and prints one line per rewritten file (so a hook can stage exactly those). `--check` writes nothing, prints `file:line  generated:NAME is stale` per stale block and exits 1; exit 0 prints a one-line OK. Generators: `scripts` = a table `| Command | Runs |` from package.json `scripts` in file order, as `pnpm <name>` and the script body in backticks (escape `|`). `env` = key names only from app.env, never values (skip blanks and `#` lines, take the text before the first `=`), grouped by prefix: `NEXT_PUBLIC_`, `TF_VAR_`, otherwise the first `_` segment when at least two keys share it, else `Other`, sorted within a group. `layout` = a fenced `text` tree of top-level tracked folders (folders with at least one tracked file that exists on disk) and the one-level subfolders of `src/`, names only, no counts. Each block body is formatted with `prettier.format(body, {parser: "markdown", ...await prettier.resolveConfig(file)})` so a later `prettier --write` or `--check` never changes it. The check must compare the same formatted text. Rule: no code comments except a short why-comment; explicit errors, no silent catches.
  - inputs: CLAUDE.md, package.json (scripts), app.env (read key names only; never print or log values), README.md (to see the current hand-written blocks), scripts/check-doc-references.mjs (style), .prettierrc.json
  - files: scripts/generate-doc-sections.mjs, package.json
  - acceptance: `node scripts/generate-doc-sections.mjs --check; test $? -eq 0 && pnpm exec eslint scripts/generate-doc-sections.mjs && pnpm exec prettier --check scripts/generate-doc-sections.mjs package.json` (README has no markers yet, so `--check` must exit 0 and report no blocks)
  - deps: none · parallel: no
- [x] T2 — Generator tests (est. 98k / budget 500k · agent: mj-baton:executor · skills: incremental-implementation)
  - objective: Create `tests/scripts/generate-doc-sections.test.ts` in the temp-repo style of tests/scripts/check-doc-references.test.ts (mkdtemp, copy the script, `git init`, `git add`, spawnSync; also copy .prettierrc.json without the tailwind plugin if the plugin cannot resolve in the temp dir). Cases: write mode fills each of the three blocks and `--check` then exits 0; `--check` exits 1 and writes nothing when a block is stale; text outside the markers is untouched; the env block holds key names only and no value from app.env (use a sentinel value and assert it is absent from every output and file); env prefix grouping including the `Other` bucket; the layout block skips a folder whose only tracked file was deleted from disk; unknown block name, missing closing marker and duplicated block each exit 1 with `file:line`; AGENTS.md is processed when tracked and ignored when absent; a second write run is a no-op; output is prettier-stable (`prettier --check` on the written file passes).
  - inputs: scripts/generate-doc-sections.mjs, tests/scripts/check-doc-references.test.ts, CLAUDE.md
  - files: tests/scripts/generate-doc-sections.test.ts
  - acceptance: `pnpm exec vitest run tests/scripts/generate-doc-sections.test.ts && pnpm exec eslint tests/scripts/generate-doc-sections.test.ts && pnpm exec prettier --check tests/scripts/generate-doc-sections.test.ts`
  - deps: T1 · parallel: yes
- [x] T3 — Generated blocks in README (est. 84k / budget 500k · agent: mj-baton:executor · skills: none)
  - objective: In README.md replace the hand-written `## Commands` table with a `scripts` block, and add an `env` block and a `layout` block, each under its own short heading or as a sub-list in an existing section (for example the env block after the paragraph that explains app.env in Getting started; the layout block in a new `## Repository layout` section after Stack). Keep the sentence about what the test projects need by moving the useful prose (unit tests need no database, integration needs DATABASE_URL, e2e runs against out/) into the Getting started text so no information is lost. Then run `pnpm docs:generate`. CLAUDE.md gets no block today, because it has no hand-written scripts, env or layout section; do not add one. Do not touch the hand-written Stack, Content, Lead capture, IPv6 and Deployment sections.
  - inputs: README.md, scripts/generate-doc-sections.mjs, package.json
  - files: README.md
  - acceptance: `pnpm docs:generate && pnpm docs:check && pnpm exec prettier --check README.md && git diff --stat -- README.md`
  - deps: T1 · parallel: yes
- [x] T4 — Lefthook and CI wiring (est. 108k / budget 500k · agent: mj-baton:architect · skills: ci-cd-and-automation)
  - objective: In lefthook.yml, add two jobs at the top of the pre-commit `fix` group, before prettier. Do not use `stage_fixed` for them: it was proven in lefthook 2.1.14 not to stage a file that was not already staged, and it stages only after the group, so a later `git diff --quiet` guard sees false diffs. `docs-generate` has no glob; it runs `pnpm --silent docs:generate`, then `git add`s exactly the printed paths. It fails (stderr message and `fail_text`) when `package.json` or `app.env` has unstaged edits, or when a rewritten file already has unstaged edits. `diagrams-build` has a glob list (`src/lib/**`, `src/api/**`, `docs/diagrams/*.mmd`, `docs/diagrams/SOURCES.md`, `docs/diagrams/diagrams.manifest.json`, the two `scripts/generate-*diagrams.mjs`) with `exclude: "**/*.test.{ts,tsx}"` and no `{staged_files}` placeholder, so deletions trigger it. It fails on unstaged edits in `src/lib`, `src/api` or a hand-written `.mmd`, otherwise runs `pnpm --silent diagrams:build` and `git add`s `D5-module-map.mmd`, `SOURCES.md` and `diagrams.manifest.json`. In the `verify` group, replace the `docs` job with `docs-check` (`pnpm docs:check`, unscoped) and `diagrams-check` (`pnpm diagrams:check`, same glob and exclude as the build). In `pre-push` and `verify-all`, split `docs` into the same two unscoped jobs. Every new job carries a `fail_text` with its fix command and the bypass. No `.prettierignore` or `package.json` change. In .github/workflows/ci.yml, rename only the docs step to "Docs reference real paths and generated sections are current". Report one finding without fixing it: ci.yml `paths-ignore: "**.md", "docs/**"` means a doc-only PR never runs these checks. Mention the optional docs.yml follow-up in the report, not in the diff.
  - inputs: lefthook.yml, .github/workflows/ci.yml, package.json, docs/diagrams/README.md, scripts/generate-diagrams.mjs, scripts/generate-derived-diagrams.mjs, scripts/generate-doc-sections.mjs
  - files: lefthook.yml, .github/workflows/ci.yml
  - acceptance: `pnpm exec lefthook validate && pnpm exec prettier --check lefthook.yml .github/workflows/ci.yml && pnpm docs:check && pnpm diagrams:check`
  - deps: T1, T3 · parallel: no
- [x] T5 — docs-sync script (est. 123k / budget 500k · agent: mj-baton:executor · skills: none)
  - objective: Create `scripts/docs-sync.sh` (bash, `set -euo pipefail`, shellcheck clean, sections CONFIGURATION / LOGGING / HELPERS / CORE / EXECUTION in that order, a `die()` that writes to stderr and exits non-zero; follow ~/.claude/rules/shell.md) and `"docs:sync": "bash scripts/docs-sync.sh"` in package.json. Behaviour: one optional argument, a git ref (default `main`); `die` when `claude` or the ref is missing; collect `git diff --stat <ref>...HEAD` and the changed file list; run `claude -p` non-interactively with a prompt that tells it to bring README.md, CLAUDE.md, AGENTS.md (only if it exists), top-level docs/_.md and the hand-authored docs/diagrams/_.mmd in line with the code changes, never to edit anything between `generated:` markers, docs/plans, or the derived D5 diagram and SOURCES.md, and never to invent. First run `claude --help` and take every flag from its output, not from memory (it lists `-p/--print`, `--permission-mode` with `acceptEdits`, `--allowedTools`, `--disallowedTools`, `--no-session-persistence`, `--max-budget-usd`, `--add-dir`); use the least permission that works (an allow list of Read, Glob, Grep, Edit, Write and read-only git; deny edits under docs/plans). After the model run, execute `pnpm docs:generate`, `pnpm diagrams:build`, `pnpm docs:check` and `pnpm diagrams:check` in that order, stopping at the first failure. It is not referenced from lefthook.yml or ci.yml. Also create `scripts/docs-sync.test.sh` in the style of scripts/app-env.test.sh, with a stub `claude` and stub `pnpm` on PATH that record their arguments: assert the ref default and override, the flags passed, the order of the four follow-up commands, and the `die` paths (missing ref, missing claude). Add `bash scripts/docs-sync.test.sh` as a step next to the existing app-env test in .github/workflows/ci.yml. Never run the real `claude -p` on the repo from the test.
  - inputs: package.json, scripts/app-env.test.sh, scripts/with-env.sh, .github/workflows/ci.yml, ~/.claude/rules/shell.md, `claude --help`
  - files: scripts/docs-sync.sh, scripts/docs-sync.test.sh, package.json, .github/workflows/ci.yml
  - acceptance: `shellcheck scripts/docs-sync.sh scripts/docs-sync.test.sh && bash scripts/docs-sync.test.sh && pnpm exec prettier --check package.json .github/workflows/ci.yml && pnpm exec lefthook validate`
  - deps: T1, T4 · parallel: no
- [x] T6 — README documentation section (est. 73k / budget 500k · agent: mj-baton:executor · skills: none)
  - objective: Add one short `## Keeping docs correct` section to README.md (placed after Getting started, at most about 15 lines) covering: what the pre-commit fix step regenerates (generated blocks via `pnpm docs:generate`, diagrams via `pnpm diagrams:build`) and stages; that the verify step, pre-push and CI fail on stale docs (`pnpm docs:check`, `pnpm diagrams:check`); the marker syntax `<!-- generated:NAME -->` (do not write it literally inside a real block, so put the marker example in a fenced block outside any generator-owned region or describe it in words if the generator rejects it); and `pnpm docs:sync [ref]` as the on-demand, AI-assisted pass that is never run by a hook. Then run `pnpm docs:generate` so the scripts table now lists `docs:sync`.
  - inputs: README.md, scripts/docs-sync.sh, lefthook.yml
  - files: README.md
  - acceptance: `pnpm docs:generate && pnpm docs:check && pnpm exec prettier --check README.md`
  - deps: T3, T5 · parallel: no
- [x] V — Final verification (est. 125k / budget 500k · agent: general-purpose · skills: none)
  - objective: Prove the goal end to end without committing. In a throwaway clone under the scratchpad: change `package.json` scripts and add a src subfolder, run `pnpm exec lefthook run pre-commit` with those changes staged and confirm README.md is regenerated and staged; revert, then hand-edit a generated block and confirm `pnpm docs:check` and the verify job fail; confirm `docs:sync` appears in no hook or workflow except its own test step. Run the tests for the changed files only: `pnpm exec vitest run tests/scripts/generate-doc-sections.test.ts tests/scripts/check-doc-references.test.ts`, `shellcheck scripts/docs-sync.sh scripts/docs-sync.test.sh`, `bash scripts/docs-sync.test.sh`, eslint and prettier on the touched files, `pnpm exec lefthook validate`, `pnpm docs:check`, `pnpm diagrams:check`. Confirm no env value appears in README.md, no debug output or leftover files, and no changes under docs/plans other than this plan.
  - acceptance: `pnpm docs:check && pnpm diagrams:check && pnpm exec lefthook validate && bash scripts/docs-sync.test.sh && pnpm exec vitest run tests/scripts/generate-doc-sections.test.ts tests/scripts/check-doc-references.test.ts`
  - deps: T6 · parallel: no

## Log

- 2026-10-15 00:00 plan created: units estimated with overhead 30000, budget 500000, every unit fits whole
- 2026-10-15 T1 done: generator + docs:generate; docs:check folds in --check; reviewed (env names only)
- 2026-10-15 T2 done: 13 tests pass, generator unchanged; T3 done: README scripts/env/layout blocks, docs:check clean
- 2026-10-15 T4 replaced by the judged design from workflow wf_613ab637-1e8 (3 independent designs + judge; stage_fixed proven not to stage unstaged files)
- 2026-10-15 T4 done (99483cd): 4 clone proofs passed; live hook ran docs-generate 0.32s, diagrams skipped correctly
- 2026-10-15 T5 done: docs-sync + stub test; permission rules switched to documented Bash(git x *) form
- 2026-10-15 T6 done: README 'Keeping docs correct' section
- 2026-10-15 V PASS (verifier-docs): 11 clone probes passed; findings: ci.yml paths-ignore (accepted), user's docs/plans moves uncommitted
