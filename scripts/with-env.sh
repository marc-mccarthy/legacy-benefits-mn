#!/bin/sh
set -eu
if [ -n "${CI:-}" ]; then exec "$@"; fi
case "${APP_ENV:-prod}" in
  prod) file=app.prod.env ;;
  dev) file=app.dev.env ;;
  *)
    echo "with-env: APP_ENV must be prod or dev" >&2
    exit 1
    ;;
esac
for f in .env .env.*; do
  if [ -e "$f" ]; then
    echo "with-env: $f exists; env comes only from $file" >&2
    exit 1
  fi
done
if [ ! -f "$file" ]; then
  echo "with-env: $file not found" >&2
  exit 1
fi
if ! command -v op >/dev/null 2>&1; then
  echo "with-env: the 1Password CLI (op) is not installed" >&2
  exit 1
fi
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
trap 'exit 130' INT TERM
grep -Ev '^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)' "$file" >"$tmp"
op run --env-file="$tmp" -- "$@"
