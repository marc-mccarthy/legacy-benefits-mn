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
  case "$a" in --env-file=*) f="${a#--env-file=}"; cp "$f" "$OP_CAPTURE" ;; esac
done
while IFS= read -r line; do
  k="${line%%=*}"
  if [ "$k" = "${OP_BLANK:-}" ]; then export "$k="; else export "$k=resolved"; fi
done <"$f"
while [ "$1" != "--" ]; do shift; done
shift
exec "$@"
EOF
  printf '#!/bin/sh\necho "$*" >>"%s"\n' "$tmp/tf-calls" >"$tmp/bin/terraform"
  chmod +x "$tmp/bin/op" "$tmp/bin/terraform"
}

tf_sh() {
  set +e
  env -u CI PATH="$tmp/bin:$PATH" OP_CAPTURE="$tmp/captured" OP_BLANK="${BLANK:-}" TMPDIR="$tmp/t" bash "$tmp/w/infra/tf.sh" "$@" >/dev/null 2>&1
  code=$?
  set -e
  echo "$code"
}

fresh_infra() {
  fresh
  mkdir -p "$tmp/w/infra"
  cp "$repo/infra/tf.sh" "$tmp/w/infra/tf.sh"
  rm -f "$tmp/tf-calls"
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

fresh_infra
assert "tf.sh plan runs" "$(tf_sh plan)" 0
assert "tf.sh runs init then plan" "$(cut -d' ' -f2 "$tmp/tf-calls" | tr '\n' ' ')" "init plan "
assert "tf.sh passes only TF_VAR_ and AWS credentials" "$(grep -cvE '^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)' "$tmp/captured" || true)" 0
assert "tf.sh temp env file removed" "$(find "$tmp/t" -type f | wc -l | tr -d ' ')" 0

fresh_infra
assert "tf.sh refuses apply" "$(tf_sh apply)" 1

fresh_infra
touch "$tmp/w/infra/terraform.tfvars"
assert "tf.sh refuses tfvars" "$(tf_sh plan)" 1

fresh_infra
assert "tf.sh fails on a blank required key" "$(BLANK=TF_VAR_NAME tf_sh plan)" 1

fresh_infra
assert "tf.sh allows a blank optional key" "$(BLANK=TF_VAR_GTM_ID tf_sh plan)" 0

# EXECUTION
echo "ℹ️ app-env.test.sh passed"
