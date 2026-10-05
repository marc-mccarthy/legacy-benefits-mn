#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
TF_DIR="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [[ -z "$DOMAIN" ]]; then
  echo "usage: $0 <domain> [terraform-dir]" >&2
  exit 2
fi

for cmd in dig aws terraform; do
  command -v "$cmd" >/dev/null || { echo "missing required command: $cmd" >&2; exit 2; }
done

FAILED=0
WARNED=0

pass() { printf '  \033[32mok\033[0m    %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILED=$((FAILED + 1)); }
warn() { printf '  \033[33mwarn\033[0m  %s\n' "$1"; WARNED=$((WARNED + 1)); }
head2() { printf '\n\033[1m%s\033[0m\n' "$1"; }

TLD="${DOMAIN##*.}"
TLD_NS="$(dig +short NS "${TLD}." | sort | head -1)"
[[ -n "$TLD_NS" ]] || { echo "could not find a nameserver for .${TLD}" >&2; exit 2; }

head2 "1. DNSSEC — is a DS record still published for ${DOMAIN}?"

DS="$(dig +noall +answer +norecurse DS "$DOMAIN" @"$TLD_NS" | awk '{$1=$1};1')"

if [[ -n "$DS" ]]; then
  fail "DS record is LIVE at the .${TLD} registry:"
  printf '        %s\n' "$DS"
  cat <<EOF

        The Route 53 zone is UNSIGNED. Switching nameservers now makes
        validating resolvers ask for signatures that do not exist and return
        SERVFAIL for the entire domain, mail included. That is an outage, not
        a degradation, and the DS TTL means up to 24 hours before undoing it
        takes effect.

        Disable DNSSEC at the registrar, wait for this check to come back
        clean, and only then continue.
EOF
else
  pass "no DS published — the delegation can move without breaking validation"
fi

head2 "2. Delegation — where does ${DOMAIN} point today?"

OLD_NS="$(dig +noall +authority +norecurse NS "$DOMAIN" @"$TLD_NS" |
  awk '$4 == "NS" { print $5 }' | sort)"

if [[ -z "$OLD_NS" ]]; then
  fail "the registry publishes no delegation for ${DOMAIN}"
else
  printf '  current (registrar):\n'
  printf '        %s\n' $OLD_NS
fi

ZONE_ID="$(terraform -chdir="$TF_DIR" output -raw route53_zone_id 2>/dev/null || true)"
if [[ -z "$ZONE_ID" || "$ZONE_ID" == "null" ]]; then
  fail "no route53_zone_id output in ${TF_DIR} — has the zone been applied?"
  echo
  echo "aborting: nothing to verify against."
  exit 1
fi

NEW_NS="$(aws route53 get-hosted-zone --id "$ZONE_ID" \
  --query 'DelegationSet.NameServers' --output text | tr '\t' '\n' | sort)"

printf '  new (Route 53, zone %s):\n' "$ZONE_ID"
printf '        %s\n' $NEW_NS

RESOLVER="$(echo "$NEW_NS" | head -1)"
OLD_RESOLVER="$(echo "$OLD_NS" | head -1)"

head2 "3. Does the new zone answer everything the old one does?"

compare() {
  local name="$1" type="$2" old new
  old="$(dig +short "$type" "$name" @"$OLD_RESOLVER" 2>/dev/null | sort | tr '\n' ' ')"
  new="$(dig +short "$type" "$name" @"$RESOLVER" 2>/dev/null | sort | tr '\n' ' ')"

  if [[ -z "$old" && -z "$new" ]]; then
    return
  elif [[ -z "$old" ]]; then
    pass "${type} ${name} — new only (nothing to lose)"
  elif [[ "$old" == "$new" ]]; then
    pass "${type} ${name}"
  else
    fail "${type} ${name} — the new zone does not match the old one"
    printf '        old: %s\n' "${old:-<empty>}"
    printf '        new: %s\n' "${new:-<empty>}"
  fi
}

RECORD_SETS="$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --query "ResourceRecordSets[?Type!='NS' && Type!='SOA'].[Name,Type]" \
  --output text)"

if [[ -z "$OLD_RESOLVER" ]]; then
  warn "no current delegation to compare against — skipping the old-vs-new diff"
else
  while read -r name type; do
    [[ -z "$name" ]] && continue
    [[ "$type" == "A" || "$type" == "AAAA" ]] && continue
    compare "${name%.}" "$type"
  done <<<"$RECORD_SETS"
fi

head2 "4. Mail — the records whose loss is silent"

MX="$(dig +short MX "$DOMAIN" @"$RESOLVER" | sort | tr '\n' ' ')"
[[ -n "$MX" ]] && pass "MX: ${MX}" || fail "MX is EMPTY in the new zone — switching now bounces mail"

SPF="$(dig +short TXT "$DOMAIN" @"$RESOLVER" | grep -c 'v=spf1' || true)"
case "$SPF" in
  0) fail "no SPF record in the new zone" ;;
  1) pass "exactly one SPF record" ;;
  *) fail "${SPF} SPF records — a domain may publish only one, and two is itself a delivery failure" ;;
esac

if [[ -n "$(dig +short TXT "google._domainkey.${DOMAIN}" @"$RESOLVER")" ]]; then
  pass "DKIM selector google is published"
else
  warn "no DKIM at selector google — mail will keep flowing while failing authentication"
fi

head2 "5. Records nothing can enumerate for you"

if [[ -n "$OLD_RESOLVER" ]]; then
  for n in mail calendar drive sites groups start docs autodiscover ftp blog shop \
    m api dev staging www _domainconnect _acme-challenge em \
    s1._domainkey s2._domainkey selector1._domainkey selector2._domainkey k1._domainkey; do
    old="$(dig +short "${n}.${DOMAIN}" @"$OLD_RESOLVER" 2>/dev/null | tr '\n' ' ')"
    new="$(dig +short "${n}.${DOMAIN}" @"$RESOLVER" 2>/dev/null | tr '\n' ' ')"
    if [[ -n "$old" && -z "$new" ]]; then
      fail "${n}.${DOMAIN} exists today and is MISSING from the new zone: ${old}"
    fi
  done
fi
warn "this probe only finds names it already knows. Confirm against a full export of the old zone:"
printf '        gcloud dns record-sets export zone.txt --zone=ZONE --zone-file-format\n'

head2 "Result"

if [[ "$FAILED" -gt 0 ]]; then
  printf '  \033[31m%d check(s) failed. DO NOT change the nameservers.\033[0m\n\n' "$FAILED"
  exit 1
fi

printf '  \033[32mAll checks passed'
if [[ "$WARNED" -gt 0 ]]; then
  printf ' (%d warning(s) above — read them)' "$WARNED"
fi
printf '.\033[0m\n\n'
cat <<EOF
  Safe to point the registrar at the Route 53 nameservers listed in step 2.
  Afterwards: wait for the parent delegation TTL (up to 48h), confirm mail
  still delivers, then set use_domain = true and apply again.

EOF
