#!/bin/sh
if [ -z "$CI" ] && [ -f .env ] && grep -q 'op://' .env; then
  if ! command -v op >/dev/null 2>&1; then
    echo "with-env: .env holds op:// references but the 1Password CLI (op) is not installed" >&2
    exit 1
  fi
  exec op run --env-file=.env -- "$@"
fi
exec "$@"
