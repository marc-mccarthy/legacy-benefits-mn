#!/usr/bin/env bash
set -euo pipefail

# CONFIGURATION
repo="$(cd "$(dirname "$0")/.." && pwd)"
unset APP_ENV
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
  cp "$repo/app.prod.env" "$repo/app.dev.env" "$tmp/w/"
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
rm "$tmp/w/app.prod.env"
assert "missing app.prod.env refused" "$(with_env true)" 1

fresh
rm -f "$tmp/captured"
assert "op run succeeds" "$(with_env true)" 0
assert "no TF_VAR_ passed to op" "$(grep -c '^TF_VAR_' "$tmp/captured" || true)" 0
assert "no AWS credentials passed to op" "$(grep -cE '^AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=' "$tmp/captured" || true)" 0
assert "AWS_REGION passed to op" "$(grep -c '^AWS_REGION=' "$tmp/captured")" 1
assert "prod default uses the prod item" "$(grep -c 'Legacy Benefits Group Dev' "$tmp/captured" || true)" 0
assert "prod default passes the Prod item to op" "$([ "$(grep -c 'Legacy Benefits Group Prod' "$tmp/captured")" -gt 0 ] && echo yes || echo no)" yes
assert "temp env file removed" "$(find "$tmp/t" -type f | wc -l | tr -d ' ')" 0

fresh
rm "$tmp/w/app.dev.env"
assert "missing app.dev.env refused for dev" "$(APP_ENV=dev with_env true)" 1

fresh
rm -f "$tmp/captured"
assert "APP_ENV=dev succeeds" "$(APP_ENV=dev with_env true)" 0
assert "APP_ENV=dev passes the Dev item to op" "$([ "$(grep -c 'Legacy Benefits Group Dev' "$tmp/captured")" -gt 0 ] && echo yes || echo no)" yes
assert "APP_ENV=dev passes AWS_REGION to op" "$(grep -c '^AWS_REGION=' "$tmp/captured")" 1
assert "APP_ENV=dev passes no TF_VAR_ to op" "$(grep -c '^TF_VAR_' "$tmp/captured" || true)" 0

fresh
assert "APP_ENV=prod succeeds" "$(APP_ENV=prod with_env true)" 0

fresh
assert "APP_ENV=staging refused" "$(APP_ENV=staging with_env true)" 1

fresh
set +e
err=$(cd "$tmp/w" && env -u CI APP_ENV=staging PATH="$tmp/bin:$PATH" sh "$repo/scripts/with-env.sh" true 2>&1 >/dev/null)
set -e
assert "APP_ENV=staging error text" "$err" "with-env: APP_ENV must be prod or dev"

fresh
rm -f "$tmp/captured"
assert "empty APP_ENV selects prod" "$(APP_ENV='' with_env true)" 0
assert "empty APP_ENV passes no Dev item to op" "$(grep -c 'Legacy Benefits Group Dev' "$tmp/captured" || true)" 0

fresh
touch "$tmp/w/.env"
set +e
(cd "$tmp/w" && CI=true PATH="$tmp/bin:$PATH" sh "$repo/scripts/with-env.sh" true) >/dev/null 2>&1
code=$?
set -e
assert "CI skips op and env checks" "$code" 0

# EXECUTION
echo "ℹ️ app-env.test.sh passed"
