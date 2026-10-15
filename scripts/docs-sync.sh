#!/usr/bin/env bash
set -euo pipefail

# CONFIGURATION
repo="$(cd "$(dirname "$0")/.." && pwd)"
ref="${1:-main}"
max_budget_usd="2"
allowed_tools="Read,Glob,Grep,Edit(README.md),Write(README.md),Edit(CLAUDE.md),Write(CLAUDE.md),Edit(AGENTS.md),Write(AGENTS.md),Edit(docs/*.md),Write(docs/*.md),Edit(docs/diagrams/*.mmd),Write(docs/diagrams/*.mmd),Bash(git diff *),Bash(git log *),Bash(git show *),Bash(git status *)"
denied_tools="Edit(docs/plans/**),Write(docs/plans/**),Edit(docs/diagrams/D5-module-map.mmd),Write(docs/diagrams/D5-module-map.mmd),Edit(docs/diagrams/SOURCES.md),Write(docs/diagrams/SOURCES.md)"

# LOGGING
die() {
  echo "❌ $*" >&2
  exit 1
}

info() {
  echo "ℹ️ $*"
}

# HELPERS
require_inputs() {
  command -v claude >/dev/null 2>&1 || die "claude CLI not found on PATH"
  git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null || die "git ref not found: ${ref}"
}

build_prompt() {
  local base stat files
  base="$(git merge-base "$ref" HEAD)"
  stat="$(git diff --stat "$base")"
  files="$(git diff --name-only "$base")"
  cat <<PROMPT
You are updating documentation so it matches the code changes since ${ref}, including uncommitted work.

Bring these files in line with the changes: README.md, CLAUDE.md, AGENTS.md (only if it exists), the top-level docs/*.md files, and the hand-authored docs/diagrams/*.mmd files.

Rules:
- Never edit anything between <!-- generated:NAME --> and <!-- /generated:NAME --> markers. Those blocks are rebuilt by tooling.
- Never edit anything under docs/plans.
- Never edit docs/diagrams/D5-module-map.mmd or docs/diagrams/SOURCES.md. They are derived.
- Never invent facts. Read the code and the diff before you write; change a doc only where the diff makes it wrong or incomplete, and leave everything else byte-identical.
- Edit no file outside the list above.

Diff stat (since ${ref}, working tree):
${stat}

Changed files:
${files}
PROMPT
}

run_claude() {
  build_prompt | claude -p \
    --permission-mode dontAsk \
    --permission-prompts none \
    --allowedTools "$allowed_tools" \
    --disallowedTools "$denied_tools" \
    --no-session-persistence \
    --max-budget-usd "$max_budget_usd"
}

# CORE
sync_docs() {
  require_inputs
  info "Syncing docs against ${ref}"
  run_claude
  pnpm docs:generate
  pnpm diagrams:build
  pnpm docs:check
  pnpm diagrams:check
  info "docs-sync finished; review the changes with git diff"
}

# EXECUTION
cd "$repo"
sync_docs
