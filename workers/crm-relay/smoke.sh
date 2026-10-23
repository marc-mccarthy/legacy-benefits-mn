#!/usr/bin/env bash
# Checks the deployed crm-relay without writing to the CRM.
# Usage: bash workers/crm-relay/smoke.sh
set -euo pipefail

# CONFIGURATION
site="op://Secrets/nyhuh2hishlhzisc7mqra4s6oa"

# LOGGING
die() {
  echo "❌ $*" >&2
  exit 1
}

info() {
  echo "ℹ️ $*"
}

# HELPERS
status_of() {
  curl -sS -o /dev/null -w '%{http_code}' "$@"
}

expect() {
  local want="$1" label="$2" got
  shift 2
  got="$(status_of "$@")"
  [[ "$got" == "$want" ]] || die "$label: expected $want, got $got"
  info "$label: $got"
}

# EXECUTION
url="$(op read "$site/CRM_RELAY_URL")" || die "could not read CRM_RELAY_URL"
secret="$(op read "$site/CRM_RELAY_SECRET")" || die "could not read CRM_RELAY_SECRET"

expect 200 "health" "$url/health"
expect 401 "lead without auth" -X POST "$url/lead" -d '{}'
expect 400 "lead with auth, empty body" -X POST "$url/lead" \
  -H @<(printf 'authorization: Bearer %s\n' "$secret") -H "content-type: application/json" -d '{}'
info "relay OK"
