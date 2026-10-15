#!/usr/bin/env bash
set -euo pipefail

# CONFIGURATION
repo="$(cd "$(dirname "$0")/.." && pwd)"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# LOGGING
die() {
  echo "❌ $*" >&2
  exit 1
}

# HELPERS
mkstubs() {
  mkdir -p "$tmp/bin" "$tmp/nobin"
  cat >"$tmp/bin/claude" <<'STUB'
#!/bin/sh
echo "claude" >>"$CALLS"
printf '%s\n' "$@" >"$CLAUDE_ARGS"
cat >"$CLAUDE_STDIN"
STUB
  cat >"$tmp/bin/pnpm" <<'STUB'
#!/bin/sh
echo "pnpm $*" >>"$CALLS"
[ "$*" != "${PNPM_FAIL:-}" ]
STUB
  chmod +x "$tmp/bin/claude" "$tmp/bin/pnpm"
  ln -s "$(command -v git)" "$tmp/nobin/git"
  ln -s "$(command -v dirname)" "$tmp/nobin/dirname"
}

fresh() {
  rm -rf "$tmp/w" "$tmp/calls" "$tmp/args" "$tmp/stdin"
  mkdir -p "$tmp/w/scripts"
  cp "$repo/scripts/docs-sync.sh" "$tmp/w/scripts/docs-sync.sh"
  (
    cd "$tmp/w"
    git init -q -b main
    git config user.email t@example.com
    git config user.name t
    echo a >a.txt
    git add .
    git commit -q -m base
    git branch -q alt
    git checkout -q -b feature
    echo b >b.txt
    git add b.txt
    git commit -q -m change
  )
}

sync() {
  set +e
  (cd "$tmp/w" && PATH="$tmp/bin:$PATH" CALLS="$tmp/calls" CLAUDE_ARGS="$tmp/args" CLAUDE_STDIN="$tmp/stdin" bash scripts/docs-sync.sh "$@") >/dev/null 2>"$tmp/err"
  code=$?
  set -e
  echo "$code"
}

assert() {
  [ "$2" = "$3" ] || die "$1: expected $3, got $2"
}

has_line() {
  grep -qxF -- "$2" "$1"
}

# CORE
mkstubs

fresh
assert "default ref run succeeds" "$(sync)" 0
assert "prompt names default ref" "$(grep -c 'between main and HEAD' "$tmp/stdin")" 1
assert "prompt lists changed file" "$(grep -c '^b.txt$' "$tmp/stdin")" 1
assert "prompt forbids generated markers" "$(grep -c 'Never edit anything between <!-- generated:NAME -->' "$tmp/stdin")" 1
assert "prompt forbids docs/plans" "$(grep -c 'Never edit anything under docs/plans' "$tmp/stdin")" 1
assert "prompt forbids derived diagrams" "$(grep -c 'D5-module-map.mmd or docs/diagrams/SOURCES.md' "$tmp/stdin")" 1
assert "prompt forbids inventing" "$(grep -c 'Never invent facts' "$tmp/stdin")" 1

for flag in -p --permission-mode acceptEdits --permission-prompts none --allowedTools --disallowedTools --no-session-persistence --max-budget-usd; do
  has_line "$tmp/args" "$flag" || die "claude flag missing: $flag"
done
assert "no bypass flag" "$(grep -c 'dangerously' "$tmp/args" || true)" 0
assert "docs/plans edits denied" "$(grep -c 'Edit(docs/plans/\*\*),Write(docs/plans/\*\*)' "$tmp/args")" 1
assert "no Bash wildcard allowed" "$(grep -c 'Bash(\*' "$tmp/args" || true)" 0

assert "call order" "$(paste -sd, "$tmp/calls")" "claude,pnpm docs:generate,pnpm diagrams:build,pnpm docs:check,pnpm diagrams:check"

fresh
assert "ref override succeeds" "$(sync alt)" 0
assert "prompt names overridden ref" "$(grep -c 'between alt and HEAD' "$tmp/stdin")" 1

fresh
assert "missing ref refused" "$(sync nope)" 1
grep -q 'git ref not found: nope' "$tmp/err" || die "missing ref message not on stderr"
assert "nothing ran on missing ref" "$(test -e "$tmp/calls" && echo ran || echo none)" none

fresh
set +e
(cd "$tmp/w" && PATH="$tmp/nobin" /bin/bash scripts/docs-sync.sh) >/dev/null 2>"$tmp/err"
code=$?
set -e
assert "missing claude refused" "$code" 1
grep -q 'claude CLI not found' "$tmp/err" || die "missing claude message not on stderr"

fresh
fresh
set +e
(cd "$tmp/w" && PNPM_FAIL="diagrams:build" PATH="$tmp/bin:$PATH" CALLS="$tmp/calls" CLAUDE_ARGS="$tmp/args" CLAUDE_STDIN="$tmp/stdin" bash scripts/docs-sync.sh) >/dev/null 2>&1
code=$?
set -e
assert "failing step exits non-zero" "$code" 1
assert "stops at first failure" "$(paste -sd, "$tmp/calls")" "claude,pnpm docs:generate,pnpm diagrams:build"

# EXECUTION
echo "ℹ️ docs-sync.test.sh passed"
