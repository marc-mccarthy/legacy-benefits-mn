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
mkstub() {
  mkdir -p "$tmp/bin"
  cat >"$tmp/bin/op" <<'EOF'
#!/bin/sh
for a in "$@"; do
  case "$a" in --env-file=*) cp "${a#--env-file=}" "$OP_CAPTURE" ;; esac
done
while [ "$1" != "--" ]; do shift; done
shift
exec "$@"
EOF
  chmod +x "$tmp/bin/op"
}

fresh() {
  rm -rf "$tmp/w"
  mkdir -p "$tmp/w"
  cp "$repo/app.env" "$tmp/w/app.env"
}

with_env() {
  set +e
  (cd "$tmp/w" && env -u CI PATH="$tmp/bin:$PATH" OP_CAPTURE="$tmp/captured" TMPDIR="$tmp/t" sh "$repo/scripts/with-env.sh" "$@") >/dev/null 2>&1
  code=$?
  set -e
  echo "$code"
}

assert() {
  [ "$2" = "$3" ] || die "$1: expected $3, got $2"
}

# CORE
mkstub
mkdir -p "$tmp/t"

fresh
touch "$tmp/w/.env"
assert "stray .env refused" "$(with_env true)" 1

fresh
touch "$tmp/w/.env.local"
assert "stray .env.local refused" "$(with_env true)" 1

fresh
rm "$tmp/w/app.env"
assert "missing app.env refused" "$(with_env true)" 1

fresh
rm -f "$tmp/captured"
assert "op run succeeds" "$(with_env true)" 0
assert "no TF_VAR_ passed to op" "$(grep -c '^TF_VAR_' "$tmp/captured" || true)" 0
assert "no AWS credentials passed to op" "$(grep -cE '^AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=' "$tmp/captured" || true)" 0
assert "AWS_REGION passed to op" "$(grep -c '^AWS_REGION=' "$tmp/captured")" 1
assert "temp env file removed" "$(find "$tmp/t" -type f | wc -l | tr -d ' ')" 0

fresh
touch "$tmp/w/.env"
set +e
(cd "$tmp/w" && CI=true PATH="$tmp/bin:$PATH" sh "$repo/scripts/with-env.sh" true) >/dev/null 2>&1
code=$?
set -e
assert "CI skips op and env checks" "$code" 0

# EXECUTION
echo "ℹ️ app-env.test.sh passed"
