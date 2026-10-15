#!/usr/bin/env bash
set -euo pipefail

# CONFIGURATION
root="$(cd "$(dirname "$0")/.." && pwd)"
optional=" TF_VAR_CALENDLY_URL TF_VAR_GTM_ID TF_VAR_MEDIA_HOST TF_VAR_SES_FROM_ADDRESS TF_VAR_LEAD_NOTIFICATION_EMAIL TF_VAR_TURNSTILE_SITE_KEY TF_VAR_TURNSTILE_SECRET "

# LOGGING
die() {
  echo "❌ tf.sh: $*" >&2
  exit 1
}

# HELPERS
check_no_tfvars() {
  local found
  found=$(find "$root/infra" -maxdepth 1 -name '*.tfvars' -print -quit)
  [[ -z "$found" ]] || die "$found would override app.env; remove it"
}

check_values() {
  local key
  for key in $TF_SH_KEYS; do
    [[ "$optional" == *" $key "* ]] && continue
    [[ -n "${!key:-}" ]] || die "$key is empty in 1Password"
  done
}

# CORE
inner() {
  check_values
  terraform -chdir="$root/infra" init -input=false
  terraform -chdir="$root/infra" plan -input=false -detailed-exitcode
}

outer() {
  [[ "${1:-plan}" == "plan" ]] || die "only plan is supported; CI applies"
  check_no_tfvars
  [[ -f "$root/app.env" ]] || die "app.env not found"
  command -v op >/dev/null 2>&1 || die "the 1Password CLI (op) is not installed"
  unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN TF_WORKSPACE
  tmp=$(mktemp)
  trap 'rm -f "$tmp"' EXIT
  trap 'exit 130' INT TERM
  grep -E '^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)' "$root/app.env" >"$tmp"
  TF_SH_INNER=1 TF_SH_KEYS="$(sed -nE 's/^([A-Z_][A-Z0-9_]*)=.*/\1/p' "$tmp" | tr '\n' ' ')" \
    op run --no-masking --env-file="$tmp" -- env -u OP_SERVICE_ACCOUNT_TOKEN bash "$0" plan
}

# EXECUTION
if [[ -n "${TF_SH_INNER:-}" ]]; then
  inner
else
  outer "$@"
fi
