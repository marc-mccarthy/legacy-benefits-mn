# Single app.env

Created: 2026-10-15 · Updated: 2026-10-15

Merge `.env`, `infra/build.env` and `infra/terraform.env` into one committed root `app.env` of `op://` references, modeled on `/Users/mj/repos/mccor-labs`. Builds on the uncommitted `chore/tf-var-uppercase` work.

Facts cite `path:line` from a read-only pass on 2026-10-15 (working tree, branch `chore/tf-var-uppercase`). Anything not read from a file is marked "unverified". No secret values were read.

## 1. Goal and non-goals

Goal:

- One file, `app.env`, is the only place env keys and their 1Password paths are listed.
- Local scripts, Terraform (local and CI) and the deploy build each read a filtered view of it, so each resolves only the references it needs.
- A test fails when the `TF_VAR_` keys drift from `infra/variables.tf`.

Non-goals:

- No change to how the Lambda gets its env. Terraform keeps writing it (`infra/compute.tf:29-48`).
- No change to `ci.yml` literals (`.github/workflows/ci.yml:39-43`, `:89-94`), the OIDC roles (`deploy.yml:190-194`), or the hard-coded `us-east-1` in `deploy.yml:24` and `infra/backend.tf:5`.
- No new secrets manager, no `dotenv` package, no change to `src/lib/env.ts`.
- No rename of fields in the shared `Secrets/AWS Credentials` item.

## 2. Current state

Three env files, three readers:

| File                  | Tracked              | Keys                                                           | Reader                                                                                                                    |
| --------------------- | -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `.env`                | no (`.gitignore:48`) | 20 (19 `op://`, 1 literal `NEXT_PUBLIC_SITE_URL` at `.env:59`) | `scripts/with-env.sh:2,7` (`op run --env-file=.env`), only when `$CI` is empty and `.env` contains `op://`                |
| `infra/build.env`     | yes                  | 9 (`infra/build.env:1-9`)                                      | `.github/workflows/deploy.yml:69`                                                                                         |
| `infra/terraform.env` | yes                  | 22: 3 `AWS_*` (`:1-3`), 19 `TF_VAR_*` (`:4-22`)                | `.github/workflows/deploy.yml:203` (`grep '^TF_VAR_'` into `$RUNNER_TEMP/tf.env`, then `op run`). No local runner exists. |

`.env` has no `DOMAIN_NAME` and reads `AWS_REGION` from `Secrets/AWS Credentials` (`.env:11`). Local scripts therefore start resolving `DOMAIN_NAME` and `REGION` from the project item; section 4 step 8 catches a missing field.

Wrapped by `with-env.sh`: `dev`, `build`, `test`, `test:integration`, `test:e2e`, `drizzle:migrate` (`package.json:7,8,14,16,19,21`). Unwrapped: `start`, `test:unit`, `test:coverage`, `test:watch`, `drizzle:generate` (`package.json:9,15,17,18,20`).

Branch work already in the tree (uncommitted):

- 19 Terraform variables uppercased, all `var.X` updated; 13 files, 149 insertions and 149 deletions outside `docs/` (`git diff --numstat HEAD`).
- `infra/terraform.env:4-22` keys match the 19 declarations at `infra/variables.tf:1,10,14,23,32,41,50,55,73,77,81,85,89,93,97,102,106,110,114` (set comparison done in research; Terraform not run).
- `LEAD_NOTIFICATION_EMAILS` renamed to `LEAD_NOTIFICATION_EMAIL` in `src/lib/business.ts:19`, `src/lib/email/index.ts:168`, `infra/compute.tf:46`.
- Items moved from `legacy-benefits-mn-infra` (lowercase fields) to `legacy-benefits-mn` (uppercase fields).

Defects found in that work:

- `infra/build.env:7` still points at `op://Development/legacy-benefits-mn-infra/GTM_ID`; the other eight lines use `legacy-benefits-mn`.
- 7 fields referenced by `infra/terraform.env` do not exist in item `Development/legacy-benefits-mn`: `NAME` (`:18`), `REGION` (`:19`), `LAMBDA_MEMORY_MB` (`:15`), `DB_MAX_ACU` (`:9`), `DB_SECONDS_UNTIL_AUTO_PAUSE` (`:10`), `DNS_EXTRA_RECORDS` (`:11`), `GITHUB_SUBJECT_PREFIX` (`:13`). Lowercase twins exist in `-infra` for all but `REGION` (field listing by label only, done in research). Re-listed at 03:02 on 2026-10-15 (labels only): `-infra` has no `region` label, yet `HEAD:infra/terraform.env:9,22` reads `-infra/region`; how `main`'s plan resolves it today is unverified. That same listing showed no item named `legacy-benefits-mn` in vault `Development` (only `legacy-benefits-mn-infra` and `mccor-labs` match), which conflicts with the earlier research listing; unverified why. 1Password state moves, so re-run section 4 step 8 right before acting.
- `infra/variables.tf` still has lowercase text in messages and descriptions at `:6`, `:28`, `:37`, `:46`, `:56`, `:115`, `:121`.
- `src/lib/email/index.ts` has edits beyond the rename (import swap at `:3-4`, ternary re-indentation at `:101-107` and `:165-170`). `pnpm exec prettier --check` fails on it and on `tests/lib/email/index.test.ts` ("Code style issues found in 2 files").
- `pnpm docs:check` (`package.json:35`) already exits 1 on the baseline with 2 stale references: `CLAUDE.md:41` (`public/brand/`) and `README.md:63` (`docs/DEVELOPMENT.md`).
- The Lambda env key rename `LEAD_NOTIFICATION_EMAILS` to `LEAD_NOTIFICATION_EMAIL` is not backward compatible: `HEAD:src/lib/business.ts:19` and `HEAD:src/lib/email/index.ts:168` read the old key, `infra/compute.tf:46` sets only the new one, and `src/lib/email/index.ts:38` returns `no-recipients` on an empty list. `deploy.yml:220` (Apply) runs before Migrate (`:270`) and Update function (`:290`), so the deployed code runs without recipients between Apply and Update function, and until a rerun if Migrate fails (Q15).
- `deploy.yml` has no `environment:` key (`grep` over `.github/workflows/*.yml`), so `secrets.OP_SERVICE_ACCOUNT_TOKEN` (`deploy.yml:66,200`) is read as a repository-level secret (storage level unverified). `docs/github-actions-ci-cd-setup-guide.md:144` recommends environment `production` with reviewers and `:601` says anyone with write access can read repository secrets by editing a workflow. The same vault holds `mccor-labs` (`/Users/mj/repos/mccor-labs/app.env:10-18`); whether one token reads both is unverified (Q14).

Other facts that shape the design:

- `deploy.yml:3-8` runs on every push to `main` except `**.md` and `docs/**`. Merging the branch before the 1Password fields exist breaks the Terraform plan.
- `deploy.yml:69-74` build: `op run --no-masking --env-file=infra/build.env`, requires `DOMAIN_NAME` (`:71`), derives `NEXT_PUBLIC_SITE_URL="https://$DOMAIN_NAME"` (`:72`), runs `pnpm build`. Under `$CI`, `with-env.sh` skips `op` (`scripts/with-env.sh:2`).
- `deploy.yml:203-205`: the `grep '^TF_VAR_'` also drops the 3 `AWS_*` lines, so Terraform uses the OIDC session (`deploy.yml:190-194`). The step has `set -euo pipefail` (`:202`), so zero matches fails it.
- Only `secrets.OP_SERVICE_ACCOUNT_TOKEN` is used (`deploy.yml:66,200`). Whether it can read vault `Development` is unverified.
- Next loads `.env*` files itself; `process.env` wins over them (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:268-274`). Next never loads a file named `app.env`.
- `NEXT_PUBLIC_*` is frozen at build (`environment-variables.md:164-166`). `BUSINESS_NAME` is mandatory at build (`src/lib/business.ts:13-17`).
- Falls back for the site URL differ: `src/lib/site-url.ts:5` (`https://example.invalid`) vs `src/components/seo/json-ld.tsx:13` (`http://localhost:3000`).
- `README.md:37` says `cp .env.example .env`; `.env.example` does not exist, though `.gitignore:50` un-ignores it.
- The prior `.env` comments document each key's blank behavior (`.env:1-89`), and `.env:8` cites a missing `infra/github.tf`, `.env:28` a missing `pnpm migrate`.
- The reference repo's weakness list: non-standard AWS names, no key-to-variable check, duplicate `DOMAIN_NAME`/`TF_VAR_DOMAIN_NAME` kept equal only by sharing one field (mccor-labs `app.env:4,11`).

## 3. Target design

### 3.1 `app.env` layout

- Repo root, committed, `op://` references only, one `KEY="op://..."` per line.
- One global A-Z sort in plain ASCII order (`LC_ALL=C sort`), no grouping. No blank lines, no comments, so a sort check stays trivial. `TURNSTILE_SECRET` sorts last (`TF_VAR_*` precedes it).
- Field label rule (default, see Q1): label = key minus `TF_VAR_` / `NEXT_PUBLIC_`. Every project key points at `op://Development/legacy-benefits-mn/<label>`.
- A value needed under two names appears twice, pointing at the same field. A test asserts the pair stays identical (3.5).

Keys (41):

| Key group                                                                                                                                     | Count | Points at                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`                                                                                                  | 2     | `op://Secrets/AWS Credentials/AWS_SECRET_ID` and `.../AWS_SECRET_KEY` (as `infra/terraform.env:1,3`)                  |
| `AWS_REGION`                                                                                                                                  | 1     | `op://Development/legacy-benefits-mn/REGION` (default, see Q1; today `Secrets/AWS Credentials/AWS_REGION`, `.env:11`) |
| `BUSINESS_{ADDRESS,EMAIL,NAME,PHONE}`, `DOMAIN_NAME`, `LEAD_NOTIFICATION_EMAIL`, `SES_FROM_ADDRESS`, `TURNSTILE_SECRET`                       | 8     | same-name fields                                                                                                      |
| `CRM_TRANSPORT`, `DATABASE_URL`, `MEDICAREPRO_WEBHOOK_URL`, `MEDICAREPRO_ZAPIER_HOOK_URL`, `OUTBOX_JOB_TOKEN`, `PAYLOAD_SECRET`, `PGPOOL_MAX` | 7     | same-name fields; local only, no Terraform equivalent (Lambda gets generated values, `infra/compute.tf:32-35,42`)     |
| `NEXT_PUBLIC_{CALENDLY_URL,GTM_ID,MEDIA_HOST,TURNSTILE_SITE_KEY}`                                                                             | 4     | `CALENDLY_URL`, `GTM_ID`, `MEDIA_HOST`, `TURNSTILE_SITE_KEY`                                                          |
| `TF_VAR_<each of the 19 variables>`                                                                                                           | 19    | same-name fields (`infra/terraform.env:4-22`)                                                                         |

`NEXT_PUBLIC_SITE_URL` is not in the file (see 3.3). Repo-local per-key notes from `.env:1-89` move out of the env file (Q7).

### 3.2 How each consumer reads it

| Consumer                                                                        | Filter of `app.env`                                                                        | Mechanism                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local `dev`, `build`, `test`, `test:integration`, `test:e2e`, `drizzle:migrate` | drop `TF_VAR_*`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`                              | `scripts/with-env.sh` writes the filtered lines to a `mktemp` file, runs `op run --env-file=<tmp> -- "$@"`, removes the file on exit. Skipped when `$CI` is set (unchanged from `scripts/with-env.sh:2`). |
| Local Terraform                                                                 | keep `TF_VAR_*`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` only                         | new `infra/tf.sh` (T4)                                                                                                                                                                                    |
| `deploy.yml` `build` job                                                        | keep `^(BUSINESS_\|DOMAIN_NAME=\|NEXT_PUBLIC_)` (the same 9 keys as `infra/build.env:1-9`) | `grep -E ... app.env >"$RUNNER_TEMP/build.env"`, then the existing `op run` at `deploy.yml:69`                                                                                                            |
| `deploy.yml` `terraform` job                                                    | keep `^TF_VAR_` (as today, `deploy.yml:203`)                                               | same step, source path `app.env`                                                                                                                                                                          |
| `deploy.yml` `deploy` job, `ci.yml`, `terraform.yml`                            | none                                                                                       | they read no env file (`ci.yml` literals; `terraform.yml` uses `-backend=false`). No change.                                                                                                              |
| Lambda runtime                                                                  | none                                                                                       | still written by Terraform from `var.*` (`infra/compute.tf:29-48`; `infra/ses.tf:4-7`)                                                                                                                    |

Prefix filtering at the file level means `op run` never resolves a reference its job does not need. A missing field then breaks only the jobs that use it.

`with-env.sh` also fails loudly instead of silently running unwrapped (today a missing `.env` falls through to `exec "$@"`, `scripts/with-env.sh:9`). Proposed shape:

```sh
#!/bin/sh
set -eu
if [ -n "${CI:-}" ]; then exec "$@"; fi
for f in .env .env.development .env.production .env.test; do
  [ ! -e "$f" ] || { echo "with-env: $f exists; env comes only from app.env (use .env.local for overrides)" >&2; exit 1; }
done
[ -f app.env ] || { echo "with-env: app.env not found" >&2; exit 1; }
command -v op >/dev/null 2>&1 || { echo "with-env: 1Password CLI (op) is not installed" >&2; exit 1; }
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
grep -Ev '^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)' app.env >"$tmp"
op run --env-file="$tmp" -- "$@"
```

- It does not `exec`, so the trap can remove the temp file. The temp file holds only `op://` references. Trade-off: signals reach the child through the process group; verify Ctrl-C on `pnpm dev` (T3).
- Stripping AWS credentials from app scripts keeps local tests, e2e and `next build` from sending real SES mail or reaching AWS. Ambient `~/.aws` profiles still exist (unverified whether the SDK would use them).

### 3.3 `NEXT_PUBLIC_SITE_URL` and local overrides

- Deploy build keeps deriving it from `DOMAIN_NAME` (`deploy.yml:72`), and `deploy.yml` later checks it equals the Terraform `site_url` (`deploy.yml:245-249`).
- Locally it is no longer in the env file. Default: it is unset, so `src/lib/site-url.ts:5` falls back to `https://example.invalid`. A developer who wants `http://localhost:3000` puts that one line in a gitignored `.env.local`. `.env.local` is already ignored by `.gitignore:49` (`.env*.local`) and Next gives `process.env` precedence over it, so it cannot override `op`-resolved keys. Q2 asks whether `.env.local` is acceptable at all.
- Changing `build` to derive the URL from `DOMAIN_NAME` (mccor-labs `package.json:16-17`) is rejected: `ci.yml:92` builds with a literal `NEXT_PUBLIC_SITE_URL` and no `DOMAIN_NAME`, so an unconditional derive would overwrite it.

### 3.4 AWS credentials

- Keys use the standard names `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Only the 1Password field labels stay non-standard (`AWS_SECRET_ID`, `AWS_SECRET_KEY`), because that item is in the shared `Secrets` vault (`infra/terraform.env:1,3`).
- They are read only by `infra/tf.sh`. CI never resolves them (OIDC, `deploy.yml:190-194`, and the `^TF_VAR_` filter).
- They are stripped from every app script by the `with-env.sh` filter, so the Next build and dev server never see them (the build job's filter also excludes them, as it keeps only 3 prefixes).
- The local filter is a deny list of two names, so a future credential-type key (for example `AWS_SESSION_TOKEN`) would pass through by default. Assertion 6 in 3.5 fails the test for any `AWS_*` key other than `AWS_REGION` that the filter lets through, which forces a decision when one is added.

### 3.5 Guards copied or added

From mccor-labs `infra/deploy.sh` and `deploy.yml`:

- Empty-key check inside `infra/tf.sh` (`deploy.sh:27-41`), limited to keys that must be non-empty: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `TF_VAR_{NAME,REGION,DOMAIN_NAME,GITHUB_SUBJECT_PREFIX,LAMBDA_MEMORY_MB,DB_MAX_ACU,DB_SECONDS_UNTIL_AUTO_PAUSE,DNS_EXTRA_RECORDS,BUSINESS_NAME}`. The other `TF_VAR_*` keys may be blank: `.env` documents `CALENDLY_URL`, `GTM_ID`, `MEDIA_HOST`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` and `LEAD_NOTIFICATION_EMAIL` as optional (`.env:31,43,47,52,63,86`), `infra/variables.tf:89-112` imposes no non-empty rule on them, `SES_FROM_ADDRESS` defaults to `""` (`infra/variables.tf:117`), and CI's plan has no empty check (`deploy.yml:203-205`). `-infra` currently holds empty `CALENDLY_URL`, `GTM_ID`, `NEXT_PUBLIC_MEDIA_HOST` and `TURNSTILE_SECRET` fields (label-only listing, 2026-10-15). Whether `op run` resolves a blank field is unverified (Q5).
- Plaintext guard in `deploy.yml`, before each `op run` (T5): fail if any `app.env` line is not `KEY="op://..."` (`grep -Evq`, prints nothing). The parity test alone does not protect `main`: `deploy.yml:3-8` triggers on push to `main` with no `needs:` on `ci.yml`, `ci.yml` runs on `pull_request` only (`ci.yml:3-5`), and `terraform.yml:51-58` scans config only. Whether `main` requires the `ci.yml` checks or has secret scanning on is unverified (`docs/github-actions-ci-cd-setup-guide.md:143,146` recommend both).
- Refuse `infra/*.tfvars` and `*.auto.tfvars` (`deploy.sh:45-51`); `.gitignore:66` only ignores `*.tfvars`.
- Refuse a stray `.env`, `.env.development`, `.env.production`, `.env.test` (`with-env.sh` above; mccor `deploy.sh:94-99` does the same for the web app).
- `unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN TF_WORKSPACE` in `tf.sh` (`deploy.sh:42`).
- `env -u OP_SERVICE_ACCOUNT_TOKEN` before the child (already at `deploy.yml:69,204`).

New:

- `tests/scripts/app-env.test.ts` (project `unit`, picked up by `vitest.config.ts:30`) reads `app.env` and `infra/variables.tf` and asserts:
  1. the set of `TF_VAR_` names equals the set of `variable "X"` names (19);
  2. keys are unique and sorted ASCII;
  3. every value matches `^"op://[^"]+"$`;
  4. each duplicated pair (`BUSINESS_*`, `DOMAIN_NAME`, `LEAD_NOTIFICATION_EMAIL`, `SES_FROM_ADDRESS`, `TURNSTILE_SECRET`, `NEXT_PUBLIC_X` vs `TF_VAR_X`, with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` vs `TF_VAR_TURNSTILE_SITE_KEY`, and `AWS_REGION` vs `TF_VAR_REGION`) has an identical reference;
  5. the build-job regex from 3.2 selects exactly the 9 expected keys;
  6. the `with-env.sh` deny-list regex removes every `TF_VAR_*` key and leaves no `AWS_*` key other than `AWS_REGION`.
     The regexes in 5 and 6 are copied into the test, so drift against `deploy.yml` and `with-env.sh` is possible (unverified, noted in Risks).
- `scripts/app-env.test.sh` (style of `scripts/plan-guard.test.sh:1-40`: temp dir, stub `op` and `terraform` on `PATH`) checks `with-env.sh` and `infra/tf.sh`: stray `.env` refused, TF_VAR and AWS keys filtered out of the file `op` receives, `CI` skips `op`, tfvars refused, an empty required key fails and a blank optional key passes. It runs in `ci.yml`, where `CI` is set (`playwright.config.ts:9-12` relies on that; GitHub setting it is documented runner behavior, unverified here). Every case except the `CI skips op` case therefore runs under `env -u CI`, inside a temp dir holding a copy of `app.env` and a stub `op`, so the script's early `exec "$@"` on `$CI` (3.2) does not hide them and they never see the owner's real `.env`.

## 4. Prerequisites outside the repo

Do these before merging. A merge to `main` deploys (`deploy.yml:3-8`).

1. Item `Development/legacy-benefits-mn`: add fields `NAME`, `REGION`, `LAMBDA_MEMORY_MB`, `DB_MAX_ACU`, `DB_SECONDS_UNTIL_AUTO_PAUSE`, `DNS_EXTRA_RECORDS`, `GITHUB_SUBJECT_PREFIX`. Copy values from the lowercase fields in `Development/legacy-benefits-mn-infra` (`name`, `lambda_memory_mb`, `db_max_acu`, `db_seconds_until_auto_pause`, `dns_extra_records`, `github_subject_prefix`). `REGION` has no source in either Development item; the value should equal the region in use (Q1, and Q12 for the hard-coded `us-east-1`). If the project item itself does not exist (section 2), create it first.
2. `DNS_EXTRA_RECORDS` must hold valid JSON/HCL for `map(object(...))` (`infra/variables.tf:55-63`); an empty string would not parse as a map, so store `{}` if there are none. Unverified how the current `-infra` value is formatted.
3. `MEDIA_HOST` and `DOMAIN_NAME` already exist in the item (research label listing). The `-infra` item calls the media field `NEXT_PUBLIC_MEDIA_HOST`; `app.env` uses `MEDIA_HOST`.
4. Confirm `GTM_ID` has the intended value in `legacy-benefits-mn` (the build today reads it from `-infra`, `infra/build.env:7`).
5. Service account behind `OP_SERVICE_ACCOUNT_TOKEN`: read access to vault `Development`. No access to `Secrets` is needed in CI. That vault also holds `mccor-labs`, and the token can read every item in it, including `TURNSTILE_SECRET` through the terraform job. Giving the project its own vault, and holding the token as an `environment: production` secret with reviewers and a `main` branch rule, would narrow this; it changes every `op://` path and the workflow gating, so it is an owner decision (Q14).
6. Local developers: access to vaults `Development` and `Secrets`.
7. Compare values, not just labels, for every field that today comes from `-infra` (production values: `HEAD:infra/terraform.env`, `HEAD:infra/build.env`) and moves to the project item. Hash on both sides and print only match or mismatch, for example:

   ```sh
   a=$(op read "op://Development/legacy-benefits-mn-infra/name" | shasum -a 256)
   b=$(op read "op://Development/legacy-benefits-mn/NAME" | shasum -a 256)
   [ "$a" = "$b" ] && echo "NAME match" || echo "NAME MISMATCH"
   ```

   Repeat per field, mapping `-infra` labels as in step 1 (`lead_notification_email` to `LEAD_NOTIFICATION_EMAIL`, `ses_from_address` to `SES_FROM_ADDRESS`, `github_subject_prefix` to `GITHUB_SUBJECT_PREFIX`, `NEXT_PUBLIC_MEDIA_HOST` to `MEDIA_HOST`, the rest by name). A wrong `NAME` replaces the RDS cluster (`infra/main.tf:146,177` use `var.NAME` as identifier) and the guard lets that through, because `infra/destroy-allowlist.txt` lists `aws_rds_cluster.this` and `aws_rds_cluster_instance.this`. A wrong `GITHUB_SUBJECT_PREFIX` rewrites the trust policy of the deploy and terraform roles in place (`infra/iam.tf:84,91,129`), and `scripts/plan-guard.sh:5` only inspects `delete` actions. No gate before `main` compares values, so the zero-diff plan in T4 is the hard gate.

8. Verify with labels only (no values):

   ```sh
   op item get legacy-benefits-mn --vault Development --format json | jq -r '.fields[].label' | sort -u >"$TMPDIR/have.txt"
   grep -o 'op://Development/legacy-benefits-mn/[^"]*' app.env | sed 's#.*/##' | sort -u >"$TMPDIR/want.txt"
   comm -13 "$TMPDIR/have.txt" "$TMPDIR/want.txt"
   ```

   Empty output means every referenced project field exists. Then list references that do not point at the project item:

   ```sh
   grep -o 'op://[^"]*' app.env | grep -v '^op://Development/legacy-benefits-mn/'
   ```

   Expected output: exactly the two `op://Secrets/AWS Credentials/...` lines (3.1). Anything else, including a leftover `legacy-benefits-mn-infra` path, is a defect.

9. Leave the lowercase `-infra` fields in place until the first successful deploy (rollback, section 6).

## 5. Ordered tasks

One commit per task, staging only the paths the task names. Conventional messages. Tests per global rule: run only tests for the changed files. Lint and format on touched files. Never run `terraform apply`; `plan` only after prerequisites.

### T1. Commit the uppercase work and clean its leftovers

- Files: `infra/*.tf`, `infra/variables.tf`, `infra/build.env`, `infra/terraform.env`, `src/lib/business.ts`, `src/lib/email/index.ts`, `tests/lib/business.test.ts`, `tests/lib/email/index.test.ts`. The two env files go in this commit so it is self-consistent: on `main`, `terraform.env` still has lowercase `TF_VAR_*` keys (`HEAD:infra/terraform.env:1`) while `variables.tf` would declare uppercase names, and `deploy.yml:3-8` deploys every push to `main`. T5 then removes them with a plain `git rm`.
- Change:
  - Lowercase text in `infra/variables.tf:6,28,37,46,56,115,121` becomes the uppercase variable names.
  - `infra/build.env:7`: point `GTM_ID` at `legacy-benefits-mn`, like the other eight lines.
  - Run `pnpm exec prettier --write` on `src/lib/email/index.ts` and `tests/lib/email/index.test.ts` (both fail `--check`). If the non-rename edits near `src/lib/email/index.ts:3-4` are not intentional, revert those hunks (ask the owner if unsure).
- Verify:
  - `terraform fmt -check -recursive infra` exits 0
  - `terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate` exits 0
  - `pnpm exec prettier --check src/lib/business.ts src/lib/email/index.ts tests/lib/business.test.ts tests/lib/email/index.test.ts`
  - `pnpm exec eslint src/lib/business.ts src/lib/email/index.ts`
  - `pnpm exec vitest related src/lib/business.ts src/lib/email/index.ts --run`
- Commit: `chore: uppercase terraform variables and rename LEAD_NOTIFICATION_EMAIL`

### T2. Add `app.env` and the parity test

- Files: `app.env` (new), `tests/scripts/app-env.test.ts` (new).
- Files also: `.gitignore`. Move the ignore change here from the last task so `.env.*` is never committable once `app.env` exists: `.gitignore:48-50` keeps `.env`, adds `.env.*`, drops the `!.env.example` line (no template exists; `app.env` replaces it) and the now-redundant `.env*.local` at `:49`. `git check-ignore` shows `.env.production`, `.env.development`, `.env.test` and `app.env.local` are not ignored today (only `.env`, `.env*.local` at `.gitignore:48-49`). `app.env` does not start with `.env`, so it stays tracked.
- Change: write the 41 keys from 3.1 in ASCII order; write the six assertions from 3.5. Old env files stay for now.
- Verify:
  - `pnpm exec vitest run tests/scripts/app-env.test.ts` exits 0
  - `pnpm exec eslint tests/scripts/app-env.test.ts`; `pnpm exec prettier --check tests/scripts/app-env.test.ts` (prettier on `app.env` is expected to skip it, unverified)
  - `pnpm typecheck`
  - Negative check: temporarily remove one `TF_VAR_` line and confirm the test fails, then restore (do not commit the removal).
  - `git check-ignore -v .env.production .env.development .env.test .env.local` prints a line for each, and `git check-ignore -q app.env` exits 1.
  - The prerequisite comparison in section 4, step 8.
- Commit: `feat: add committed app.env with op references`

### T3. Rewrite `scripts/with-env.sh`

- Files: `scripts/with-env.sh`, `scripts/app-env.test.sh` (new, with-env cases first), `.github/workflows/ci.yml`.
- Before the verify step, by the owner: move the untracked root `.env` (4767 bytes today) to a path outside the repo. The new script refuses to run while a root `.env` exists (3.2), and all six wrapped scripts go through it (`package.json:7,8,14,16,19,21`), so `sh scripts/with-env.sh env` and `pnpm dev` exit 1 until it is gone. Keep the moved file until the first good deploy (section 6). Do not move or delete it from the session.
- Change: script as in 3.2; add one `quality` step `- run: bash scripts/app-env.test.sh` after `pnpm diagrams:check` (`ci.yml:64-65`). `package.json` scripts do not change.
- Verify:
  - `bash scripts/app-env.test.sh` exits 0
  - `pnpm test:integration` is not run here; instead run `sh scripts/with-env.sh env | grep -c '^TF_VAR_'` expecting `0` (prints a count, not values), and `sh scripts/with-env.sh env | grep -c '^AWS_ACCESS_KEY_ID='` expecting `0`
  - `pnpm dev` starts from `app.env` alone (needs the `.env` move above and a signed-in `op`)
  - Press Ctrl-C on `pnpm dev`, then confirm no `tmp.*` file with `op://` lines remains in `$TMPDIR`
- Commit: `feat: read app.env in with-env.sh`

### T4. Add the local Terraform runner

- Files: `infra/tf.sh` (new, executable), `scripts/app-env.test.sh`.
- Change: `infra/tf.sh [plan]`:
  1. refuse `infra/*.tfvars`, `infra/*.auto.tfvars`;
  2. unset `AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN TF_WORKSPACE`;
  3. build a temp env file from `^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)` of `app.env`;
  4. re-exec under `op run --no-masking --env-file=<tmp>` (needed so plan output is readable, as at `deploy.yml:204`) with `env -u OP_SERVICE_ACCOUNT_TOKEN` and a guard variable;
  5. inside, loop the keys parsed with `sed -nE 's/^([A-Za-z_][A-Za-z0-9_]*)=.*/\1/p'` and fail on an empty value only for the must-be-non-empty keys listed in 3.5; other keys may be blank;
  6. `terraform -chdir=infra init -input=false`, then `terraform -chdir=infra plan -input=false -detailed-exitcode`.
     Only `plan` is supported (Q4). `-input=false` avoids the prompt on a missing variable that mccor-labs hit (`deploy.sh:63,66`).
- Verify:
  - `bash scripts/app-env.test.sh` exits 0
  - `bash -n infra/tf.sh`
  - `terraform fmt -check -recursive infra`
  - After prerequisites, by the owner: `infra/tf.sh plan; echo $?` where 0 is no change, 2 is changes, 1 is an error. Hard gate before merge: the only diff is the Lambda env key rename `LEAD_NOTIFICATION_EMAILS` to `LEAD_NOTIFICATION_EMAIL` (`infra/compute.tf:46`). Any other change, such as a renamed cluster or a changed trust policy, means a value differs from production (section 4 step 7); stop and fix 1Password. Also check with `scripts/plan-guard.sh` as CI does.
- Commit: `feat: add local terraform plan runner`

### T5. Switch the workflows and delete the old env files

- Files: `.github/workflows/deploy.yml`, `infra/build.env` (delete), `infra/terraform.env` (delete).
- Change:
  - `deploy.yml:69`: before the `op run`, add `grep -E '^(BUSINESS_|DOMAIN_NAME=|NEXT_PUBLIC_)' app.env >"$RUNNER_TEMP/build.env"` and point `--env-file` at it (`set -euo pipefail` is already at `:68`).
  - `deploy.yml:203`: `grep '^TF_VAR_' app.env >"$RUNNER_TEMP/tf.env"`.
  - In both steps, first fail on a non-reference line (prints nothing):

    ```sh
    if grep -Evq '^[A-Z][A-Z0-9_]*="op://[^"]+"$' app.env; then echo "::error::app.env must hold only op:// references" >&2; exit 1; fi
    ```

  - `git rm infra/build.env infra/terraform.env` (committed in T1, recoverable from git; no `-f` needed because the worktree copies are clean).
- Verify:
  - `pnpm exec prettier --check .github/workflows/deploy.yml`
  - Reproduce the two filters locally and count: `grep -cE '^(BUSINESS_|DOMAIN_NAME=|NEXT_PUBLIC_)' app.env` prints `9`; `grep -c '^TF_VAR_' app.env` prints `19`.
  - `pnpm exec vitest run tests/scripts/app-env.test.ts`
  - `git grep -n 'build\.env\|terraform\.env'` shows no hits outside `docs/` and the ledger noted in Q8
  - The workflow itself is verified on `main` by the first deploy (see Risks). A `workflow_dispatch` of the unmodified workflow from the branch stops at the ancestor-of-`main` check (`deploy.yml:42-49`), but that check lives in the same branch-controlled file, so it is not an access control (Q14).
- Commit: `ci: read app.env in the deploy workflow`

### T6. Remove the root `.env` convention from the docs

- Files: `README.md`.
- Change:
  - `README.md:37`: replace `cp .env.example .env` with a line saying `app.env` is committed, `op` must be signed in, and `.env.local` is the only local override. The `.gitignore` change is already in T2.
  - Owner deletes the `.env` moved out of the repo in T3 once `pnpm dev` has worked from `app.env` (T3 verify) and a deploy on `main` has succeeded (section 6). Do not delete it from the session.
- Verify:
  - `pnpm docs:check` exits 1 on the baseline (`CLAUDE.md:41`, `README.md:63`, section 2); expect exactly those 2 findings and none new. `README.md:63` waits on Q7.
  - `pnpm exec prettier --check README.md`
- Commit: `docs: replace .env with app.env in the readme`

### T7. Final check

- Run once before the push, per global rules: the reviewer pass (`/code-review`) and e2e. Then `pnpm exec vitest run tests/scripts/app-env.test.ts`, `bash scripts/app-env.test.sh`, `terraform fmt -check -recursive infra`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`.

## 6. Risks and rollback

Risks:

- Merge before prerequisites: `deploy.yml` plan fails on 7 unresolved fields (`infra/terraform.env:9-11,13,15,18,19` in the current tree). Mitigation: do section 4 first and run `infra/tf.sh plan` before merging.
- The deploy path cannot be tried on a branch (`deploy.yml:42-49`), so T5 is first exercised on `main`. Mitigation: the filter counts in T5 and the test in T2; `build` and `terraform` jobs fail before any apply if a reference is missing.
- Deleting the root `.env` removes the literal `NEXT_PUBLIC_SITE_URL` (`.env:59`); local canonical URLs change to the `example.invalid` fallback until `.env.local` is added.
- Local `pnpm test` still injects real `TURNSTILE_SECRET`, `PAYLOAD_SECRET` and webhook values into unit tests (same as today via `.env`); stubs in the tests cover the vars they read, others leak (inferred, not measured). Q3.
- Not using `exec` in `with-env.sh` changes signal behavior for `pnpm dev` (unverified).
- The `deploy.yml` regex and the test regex can drift apart; accepted, because the counts in T5 catch it by hand only.
- `infra/terraform.tfstate` (local, 190453 bytes, ignored by `.gitignore:64-65`) predates the S3 backend (`infra/backend.tf:2-8`); running `terraform init` locally next to it may behave unexpectedly (unverified). List it for the owner; do not delete it.
- Committed `app.env` exposes vault, item and field names. `infra/*.env` already did.
- Values are not compared by any CI gate. `plan-guard.sh` only sees `delete` actions, so a wrong `NAME` (RDS replacement is allowlisted) or `GITHUB_SUBJECT_PREFIX` (in-place trust policy change) passes. Mitigation: section 4 step 7 and the zero-diff `infra/tf.sh plan` in T4.
- The Lambda env key rename is not backward compatible (section 2). Between Apply and Update function, and until a rerun if Migrate fails, lead notifications go to nobody (`src/lib/email/index.ts:38`). Mitigation: Q15.
- The service account token sits at repository level with read access to a vault shared with `mccor-labs` (section 2). Mitigation: Q14.
- A plaintext value committed to `app.env` would deploy from `main` unless the T5 guard or a required check catches it; the `^"op://` test (3.5) runs on PRs only.

Rollback:

- Code: `git revert` the merge commit. `infra/build.env` and `infra/terraform.env` return; they still point at fields that exist after section 4 (fields are only added, never removed).
- 1Password: keep the old lowercase `-infra` fields and the owner's local `.env` until a deploy on `main` succeeds end to end. Remove them only after.
- A failed `main` deploy stops before apply if the `build` or `Plan` step fails; the live site is unchanged. A failure after apply is a Terraform state matter, not an env-file one.

## 7. PR size

Target is 300-400 hand-written changed lines against `main`, excluding lockfiles, `docs/`, markdown, snapshots, media and build output.

- Already in the tree: 149 insertions and 149 deletions across 13 files (`git diff --numstat HEAD`, `docs/` excluded). That is 298 changed lines counted as insertions plus deletions, or 149 counted as insertions.
- T1 commits the two `infra/*.env` rewrites (31 + 31 of the 298 lines: 9/9 and 22/22 in `git diff --numstat HEAD`). T5 deletes them, so against `main` they count as deletions of the original 31 lines. The rename part without them is 236 lines (118 plus 118), plus 31 deleted.
- New work (estimates, unverified until written): `app.env` 41, `tests/scripts/app-env.test.ts` about 70, `scripts/with-env.sh` about 20 replacing 9, `infra/tf.sh` about 50, `scripts/app-env.test.sh` about 80, `ci.yml` 2, `deploy.yml` about 12 (adds the plaintext guard), `.gitignore` about 3. About 275 lines.
- Whole branch: about 540 changed lines counted as insertions plus deletions (236 + 31 + 275), the count `~/.claude/hooks/pr-size-guard.sh` uses (insertions plus deletions of `origin/main...HEAD`, minus `docs/`, markdown and lockfiles). About 390 if counted as insertions only (118 + 275).

By the hook's count the PR is over 400. Per the repo rule I will not split it or drop tasks without a yes (Q6).

## 8. Open questions for the owner

| Ref | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Default in this plan                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Field label rule, and where `REGION` lives. Today `AWS_REGION` is in the shared `Secrets/AWS Credentials` item (`.env:11`), while `terraform.env:19` expects `Development/legacy-benefits-mn/REGION`, which does not exist.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Label = key minus prefix; both `AWS_REGION` and `TF_VAR_REGION` point at the project `REGION` field                                                                                                                                        |
| Q2  | May a gitignored `.env.local` exist for local overrides (such as `NEXT_PUBLIC_SITE_URL=http://localhost:3000`), or must the single file be absolute?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Allowed; `.env`, `.env.development`, `.env.production`, `.env.test` refused                                                                                                                                                                |
| Q3  | Should local `pnpm test` and e2e keep receiving all real app secrets, as now?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Yes (unchanged); only AWS credentials and `TF_VAR_*` removed                                                                                                                                                                               |
| Q4  | Is local `terraform apply` wanted? `README.md:97-98` says nothing applies Terraform, which conflicts with `deploy.yml:161-221`; CI is the only applier today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `tf.sh` supports `plan` only; README line left alone                                                                                                                                                                                       |
| Q5  | Empty-value policy for `tf.sh`. Which keys must be non-empty? Evidence in 3.5: optional keys are documented blank-able (`.env:31,43,47,52,63,86`), and `-infra` holds empty `CALENDLY_URL`, `GTM_ID`, `NEXT_PUBLIC_MEDIA_HOST`, `TURNSTILE_SECRET` fields. A blank `TURNSTILE_SECRET` skips the Turnstile check (`docs/updates-to-nates-website.md:9`).                                                                                                                                                                                                                                                                                                             | Only the AWS keys and `TF_VAR_{NAME,REGION,DOMAIN_NAME,GITHUB_SUBJECT_PREFIX,LAMBDA_MEMORY_MB,DB_MAX_ACU,DB_SECONDS_UNTIL_AUTO_PAUSE,DNS_EXTRA_RECORDS,BUSINESS_NAME}` must be non-empty; `DNS_EXTRA_RECORDS` holds `{}` rather than blank |
| Q6  | PR size: one PR of about 390-540 lines, or two (rename first, about 298 lines including the two uppercase `infra/*.env` files, which a rename-only PR must contain to keep `main` deployable, then `app.env`)? The repo rule needs your yes either way.                                                                                                                                                                                                                                                                                                                                                                                                             | One PR; awaiting your answer                                                                                                                                                                                                               |
| Q7  | Where do the per-key notes in `.env:1-89` (blank behavior, local Postgres options at `.env:25-28`) go? `README.md:63` points at `docs/DEVELOPMENT.md`, deleted in the working tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Not decided; a new doc needs your ask                                                                                                                                                                                                      |
| Q8  | Stale mentions, by what each says: `docs/plans/nate-site-updates.baton.json:487` lists `infra/terraform.env` (a ledger); `docs/updates-to-nates-website.md:9` says `turnstile_secret` is empty in the `-infra` item; `docs/plans/nate-site-updates.md:97` names `-infra` fields `lead_notification_email` and `ses_from_address`; `.superpowers/sdd/2026-10-02-visual-refresh-plan/progress.md:136,307` mention `.env`. Unrelated name collision: `docs/diagrams/D1-system-context.mmd:38` and `docs/diagrams/SOURCES.md:127` name `/etc/legacybenefitsmn/app.env` beside Caddy/EBS/systemd nodes (whether it is stale pre-Lambda is unverified). Edit any of them? | Left alone; any diagram edit must also regenerate `SOURCES.md` (`pnpm diagrams:check`, `ci.yml:64-65`)                                                                                                                                     |
| Q9  | Clean-up in 1Password after the first good deploy: the `-infra` item, plus `ACM_CERTIFICATE_ARN`, `github_repository`, `manage_github_variables` (match no variable or resource) and `SITE_URL` in the project item.                                                                                                                                                                                                                                                                                                                                                                                                                                                | Not touched                                                                                                                                                                                                                                |
| Q10 | Should `LEAD_NOTIFICATION_EMAIL` be in the build filter? `src/lib/business.ts:19` reads it at build; whether static pages use it is unverified. Today it is not in `build.env`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Not included (parity with `infra/build.env`)                                                                                                                                                                                               |
| Q11 | Keep `CRM_TRANSPORT`, `MEDICAREPRO_*` in `app.env` as local-only keys? Terraform pins `CRM_TRANSPORT="mock"` and sets no webhooks (`infra/compute.tf:42`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Kept, local only                                                                                                                                                                                                                           |
| Q12 | Out of scope but related: `deploy.yml:24` and `infra/backend.tf:5` hard-code `us-east-1` while `REGION` is a variable (`infra/variables.tf:10`). Nothing forces them to agree (unverified for the actual value). Align later?                                                                                                                                                                                                                                                                                                                                                                                                                                       | Not touched                                                                                                                                                                                                                                |
| Q13 | `docs/github-actions-ci-cd-setup-guide.md:50` calls `.env` "committed". Should that untracked guide be updated to say `app.env`?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Not touched                                                                                                                                                                                                                                |
| Q14 | Harden the 1Password token: a dedicated vault for this project (changes every `op://` path), and the token as an `environment: production` secret with reviewers and a `main`-only branch rule on the `build` and `terraform` jobs (`deploy.yml` has no `environment:` key; guide `:144`, `:601`)? Today any write-access user can reach the token by editing a workflow on a branch.                                                                                                                                                                                                                                                                               | Not changed; recorded as a risk                                                                                                                                                                                                            |
| Q15 | Lambda env key rename window (section 2): accept a short period with no lead recipients, or ship one release where the code reads `LEAD_NOTIFICATION_EMAIL` then falls back to `LEAD_NOTIFICATION_EMAILS` and Terraform sets both, then drop the old name in a second release?                                                                                                                                                                                                                                                                                                                                                                                      | Accept the window; no code change                                                                                                                                                                                                          |
