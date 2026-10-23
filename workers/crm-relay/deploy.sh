#!/usr/bin/env bash
# Deploys crm-relay to Nate's Cloudflare account and sets its secrets.
# Usage: bash workers/crm-relay/deploy.sh
set -euo pipefail

# CONFIGURATION
# Item IDs, not titles, so a rename in 1Password does not break the deploy.
nate="op://Secrets/5siwbxyc2dqc6m6lrdz3rzj5uu"
site="op://Secrets/nyhuh2hishlhzisc7mqra4s6oa"
config="$(dirname "$0")/wrangler.jsonc"

# LOGGING
die() {
  echo "❌ $*" >&2
  exit 1
}

info() {
  echo "ℹ️ $*"
}

# HELPERS
wrangler() {
  pnpm dlx wrangler@4.129.0 "$@" --config "$config"
}

secret() {
  local value
  value="$(op read "$2")" || die "could not read $1 from 1Password"
  [[ -n "$value" ]] || die "$1 is empty in 1Password"
  printf '%s' "$value" | wrangler secret put "$1"
}

# EXECUTION
command -v op >/dev/null 2>&1 || die "1Password CLI (op) not found on PATH"
CLOUDFLARE_API_TOKEN="$(op read "$nate/CLOUDFLARE_API_TOKEN")" || die "could not read the Cloudflare token"
CLOUDFLARE_ACCOUNT_ID="$(op read "$nate/CLOUDFLARE_ACCOUNT_ID")" || die "could not read the Cloudflare account ID"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

info "deploying crm-relay"
wrangler deploy
secret MEDICAREPRO_API_TOKEN "$nate/MEDICAREPRO_API_TOKEN"
secret RELAY_SECRET "$site/CRM_RELAY_SECRET"
info "deployed"
