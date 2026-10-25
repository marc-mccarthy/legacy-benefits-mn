# Single app.env for source code and Terraform

Created: 2026-10-18 · Updated: 2026-10-25

One committed file, `app.env`, lists every environment key the app and the infrastructure need. Each value is a 1Password secret reference (`op://`), never a real value. Every consumer, local scripts, Terraform, and GitHub Actions, reads a filtered copy of that file and lets the 1Password CLI (`op`) resolve the references at run time. Every claim below cites `file:line` from this repo and was verified on 2026-10-25.

## 1. What it does

- Keys and their 1Password locations live in exactly one place: `app.env` (50 lines, one `KEY="op://Vault/Item/FIELD"` per line, ASCII sorted).
- Real values live only in 1Password. Nothing on disk, nothing in git, nothing in GitHub secrets except one service-account token.
- Each runner takes only the lines it needs, so a job never resolves secrets it does not use.
- Tests fail when the file drifts from the Terraform variable set, when a value is not an `op://` reference, or when the wrapper script leaks a key it should strip.

## 2. The file

`app.env` at the repo root. Shape of every line (`app.env:1-50`):

```sh
BUSINESS_NAME="op://Legacy Benefits Group/Legacy Benefits Group/BUSINESS_NAME"
NEXT_PUBLIC_GTM_ID="op://Legacy Benefits Group/Legacy Benefits Group/GTM_ID"
TF_VAR_GTM_ID="op://Legacy Benefits Group/Legacy Benefits Group/GTM_ID"
AWS_ACCESS_KEY_ID="op://Legacy Benefits Group/AWS Credentials/AWS_SECRET_KEY_ID"
```

An `op://` reference is `op://<vault>/<item>/<field>`. Two 1Password items are used:

| Item                                                     | Holds                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `Legacy Benefits Group` in vault `Legacy Benefits Group` | every project value, one field per label (`BUSINESS_NAME`, `GTM_ID`, …) |
| `AWS Credentials` in vault `Legacy Benefits Group`       | `AWS_SECRET_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`              |

Naming rules the tests enforce (section 6):

- Key = the name the consumer reads. The 1Password field label = key minus its `TF_VAR_` or `NEXT_PUBLIC_` prefix. `NEXT_PUBLIC_GTM_ID` and `TF_VAR_GTM_ID` both point at field `GTM_ID` (`app.env:15,40`).
- A value needed under two names appears twice, pointing at the same field. That is how the app and Terraform cannot disagree.
- Every Terraform variable in `infra/variables.tf` has exactly one `TF_VAR_<NAME>` line (27 of them, `app.env:23-49`).
- No comments, no blank lines, no literals. The deploy workflow refuses the file otherwise (section 5).

Key groups in the file:

| Group                                                                                                                                                                                       | Read by                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `BUSINESS_*`, `DOMAIN_NAME`, `NEXT_PUBLIC_*`                                                                                                                                                | local scripts and the deploy build job         |
| `CRM_TRANSPORT`, `DATABASE_URL`, `LEAD_NOTIFICATION_EMAIL`, `CRM_RELAY_URL`, `CRM_RELAY_SECRET`, `OUTBOX_JOB_TOKEN`, `PAYLOAD_SECRET`, `PGPOOL_MAX`, `SES_FROM_ADDRESS`, `TURNSTILE_SECRET` | local scripts only                             |
| `TF_VAR_*`                                                                                                                                                                                  | Terraform, local and the deploy terraform job  |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`                                                                                                                                  | local Terraform only (CI uses OIDC, section 5) |

`.gitignore:47-49` ignores `.env` and `.env.*` so a file with real values can never be committed. `app.env` itself is tracked.

## 3. 1Password: references, auth, service account

`op run --env-file=<file> -- <command>` reads a dotenv file, resolves every `op://` value against the signed-in account, puts the results into the environment of `<command>`, and masks any resolved value that `<command>` prints. It also redacts them from stdout unless `--no-masking` is passed. No file with real values is ever written.

Local auth: `op signin` (`README.md:63`) against the desktop app. Developers need read access to the vault `Legacy Benefits Group`.

CI auth: a 1Password service account. Its token is the only secret GitHub holds, stored as the repository secret `OP_SERVICE_ACCOUNT_TOKEN` (confirmed with `gh secret list`, created 2026-10-13). The `op` CLI reads it from the environment variable of the same name. Each workflow step that resolves references does three things (`.github/workflows/deploy.yml:125-138` and `:263-271`):

1. Installs the CLI with `1password/install-cli-action` (`deploy.yml:49,123,253,325`).
2. Sets `OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}` on that step only, not job-wide.
3. Runs `op run --no-masking --env-file=<filtered> -- env -u OP_SERVICE_ACCOUNT_TOKEN <command>`, so the child process receives the resolved values but not the token.

The service account needs read access to the vault `Legacy Benefits Group` and nothing else. It is not needed locally.

## 4. Local use: `scripts/with-env.sh`

Every package script that needs env is wrapped (`package.json:7,8,14,16,19,21`):

| Script                  | Runs                                                      |
| ----------------------- | --------------------------------------------------------- |
| `pnpm dev`              | `sh scripts/with-env.sh next dev`                         |
| `pnpm build`            | `sh scripts/with-env.sh next build`                       |
| `pnpm test`             | `sh scripts/with-env.sh vitest run`                       |
| `pnpm test:integration` | `sh scripts/with-env.sh vitest run --project integration` |
| `pnpm test:e2e`         | `sh scripts/with-env.sh playwright test`                  |
| `pnpm drizzle:migrate`  | `sh scripts/with-env.sh drizzle-kit migrate`              |

`pnpm test:unit`, `pnpm test:coverage`, `pnpm start` and `pnpm lint` are not wrapped because they need no env.

The wrapper, in full (`scripts/with-env.sh:1-30`):

```sh
#!/bin/sh
set -eu
if [ -n "${CI:-}" ]; then exec "$@"; fi
case "${APP_ENV:-prod}" in
  prod) file=app.env ;;
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
```

What each part does:

- Line 3: under `CI` it runs the command untouched. CI supplies env as workflow literals (section 5).
- Lines 4-11: `APP_ENV` picks the file. `prod` (the default, also when `APP_ENV` is empty) reads `app.env`, `dev` reads `app.dev.env`, anything else exits 1 (section 11).
- Lines 12-17: any `.env` or `.env.*` file aborts. Next.js would load those files on its own and silently override or add values, so the pattern forbids them.
- Lines 18-25: a missing env file or a missing `op` fails loudly instead of running without env.
- Line 29: the deny filter. `TF_VAR_*` and the two AWS credential keys never reach the app, so `next build`, tests and e2e cannot touch AWS. `AWS_REGION` passes through because the SES client needs it.
- Line 30: `op run` on the filtered temp file. The temp file holds only references and is removed on exit (line 27).

These behaviours are checked with a stub `op` by `scripts/app-env.test.sh` (section 7). A run against the real vault was not repeated on 2026-10-25.

Manual override for one developer: none is supported. `.env.local` would be refused like any other `.env*` file (`with-env.sh:12-17`). Change the 1Password field instead.

## 5. GitHub Actions

Three workflows. Only `deploy.yml` touches `app.env`, `app.dev.env` and 1Password.

### `ci.yml` (pull requests)

No 1Password, no `app.env` values. `with-env.sh` sees `CI` and execs straight through (`with-env.sh:3`), so the values come from workflow literals (`ci.yml:39-43` and `:95-100`): `DATABASE_URL` for the Postgres service container, a throwaway `PAYLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL`, `BUSINESS_NAME`. Everything optional is left unset and the code treats that as "feature off". CI also runs both guard tests (`ci.yml:70` runs `bash scripts/app-env.test.sh`; `ci.yml:73` runs `pnpm test:coverage`, which includes `tests/scripts/app-env.test.ts`).

### `terraform.yml` (pull requests touching `infra/**`)

`terraform fmt -check`, `terraform init -backend=false`, `terraform validate`, `tflint`, `trivy config` (`terraform.yml:31-59`). No variables are supplied and none are needed for validate, so `app.env` is not read.

### `deploy.yml` (push to `main` or `develop`, or manual dispatch)

Four jobs. `resolve` picks the environment. The other three each read a different slice of the env file it names, written `$ENV_FILE` below for `${{ needs.resolve.outputs.env_file }}`.

No job declares `environment:`. The OIDC subject claim then keeps the default template, and the role trust policy matches on the branch (section 9).

**resolve** (`deploy.yml:33-88`): no build, no AWS. It checks out the commit, installs `op`, and one step with `OP_SERVICE_ACCOUNT_TOKEN` computes five outputs.

| Output        | prod                                                                  | dev                                                                       |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `env`         | `prod`                                                                | `dev`                                                                     |
| `branch`      | `main`                                                                | `develop`                                                                 |
| `env_file`    | `app.env`                                                             | `app.dev.env`                                                             |
| `state_key`   | `terraform.tfstate`                                                   | `dev/terraform.tfstate`                                                   |
| `tf_role_arn` | `arn:aws:iam::150701180133:role/legacybenefitsgroup-github-terraform` | `arn:aws:iam::150701180133:role/legacybenefitsgroup-dev-github-terraform` |

- The selector is the `env` dispatch input (`prod` or `dev`, required, `deploy.yml:15-19`). A push has no input, so `main` maps to `prod` and `develop` to `dev`. Any other branch fails with an `::error::` and exit 1 (`deploy.yml:59-71`).
- `<NAME>` is `op read` of the reference on the `TF_VAR_NAME` line of `$ENV_FILE`. The value must match `^[a-z][a-z0-9-]*$` before it is put into an ARN (`deploy.yml:72-81`). It is not secret and is not masked.
- The concurrency group is per environment (`deploy.yml:21-23`), so a `main` deploy and a `develop` deploy can run side by side and two deploys of one environment queue.

**build** (`deploy.yml:125-138`):

```sh
if grep -Evq '^[A-Z][A-Z0-9_]*="op://[^"]+"$' $ENV_FILE; then echo "::error::$ENV_FILE must hold only op:// references" >&2; exit 1; fi
grep -E '^(BUSINESS_|DOMAIN_NAME=|NEXT_PUBLIC_)' $ENV_FILE >"$RUNNER_TEMP/build.env"
op run --no-masking --env-file="$RUNNER_TEMP/build.env" -- env -u OP_SERVICE_ACCOUNT_TOKEN bash -c '
  set -euo pipefail
  test -n "$DOMAIN_NAME"
  export NEXT_PUBLIC_SITE_URL="https://$DOMAIN_NAME"
  echo "site_url=$NEXT_PUBLIC_SITE_URL" >>"$GITHUB_OUTPUT"
  exec pnpm build'
```

- The first `grep` is the plaintext guard: any line that is not `KEY="op://…"` fails the job before `op` runs.
- The second `grep` keeps the 10 build keys (`BUSINESS_*`, `DOMAIN_NAME`, `NEXT_PUBLIC_*`).
- `NEXT_PUBLIC_SITE_URL` is then overwritten from `DOMAIN_NAME`, and the `deploy` job later asserts it equals Terraform's `site_url` output (`deploy.yml:311-315`).
- `pnpm build` runs `with-env.sh`, which execs through because `CI` is set. The values come from this outer `op run`.

**terraform** (`deploy.yml:226-297`):

```sh
if grep -Evq '^[A-Z][A-Z0-9_]*="op://[^"]+"$' $ENV_FILE; then echo "::error::$ENV_FILE must hold only op:// references" >&2; exit 1; fi
grep '^TF_VAR_' $ENV_FILE >"$RUNNER_TEMP/tf.env"
op run --no-masking --env-file="$RUNNER_TEMP/tf.env" -- env -u OP_SERVICE_ACCOUNT_TOKEN \
  terraform -chdir=infra plan -lock-timeout=10m -out="$RUNNER_TEMP/tfplan"
```

- Same plaintext guard, then only `TF_VAR_*` lines. Terraform reads any `TF_VAR_<name>` environment variable as the value of `variable "<name>"`, so no `.tfvars` file and no `-var` flags exist.
- AWS credentials are not in this slice. The job assumes the role from the `tf_role_arn` output through GitHub OIDC (`deploy.yml:255-259`). The role's trust policy admits only this repository on `refs/heads/<GITHUB_BRANCH>` (`infra/iam.tf:66-87`, prefix from `var.GITHUB_SUBJECT_PREFIX`), so the prod role trusts `main` and the dev role trusts `develop`. No AWS key is stored anywhere in GitHub.
- `terraform init` passes `-backend-config="key=<state_key>"` (`deploy.yml:261`), so dev keeps its state under `dev/terraform.tfstate` in the same bucket while `infra/backend.tf:4` stays on the prod key.
- The plan is shown in the step summary, checked by `scripts/plan-guard.sh` against `infra/destroy-allowlist.txt` (`deploy.yml:281-284`), then applied (`deploy.yml:287`).

**deploy** (`deploy.yml:300-445`): uploads the artifacts and runs migrations. Everything it needs comes from Terraform outputs of the previous job, with one exception. The "Verify serving" step reads the `TF_VAR_BASIC_AUTH_USER` and `TF_VAR_BASIC_AUTH_PASSWORD` lines of `$ENV_FILE` (`deploy.yml:411-413`), so the job sparse-checks-out `app.env` and `app.dev.env` (`deploy.yml:317-323`) and installs `op`. Only the page request to `/` sends `-u user:password`, and only when both values are non-empty, which is dev. The `/api/health` and `/api/do-not-contact` checks stay unauthenticated because Terraform gates only page requests.

### How the running app gets its env

Terraform writes the Lambda environment from `var.*` plus generated secrets (`infra/compute.tf:29-50`). `DATABASE_URL`, `PAYLOAD_SECRET` and `OUTBOX_JOB_TOKEN` are `random_password` resources, never in 1Password. That is why those keys exist in `app.env` for local use only (section 2).

## 6. Where the variables are used

### Source code

`src/lib/env.ts:1-14` is the only accessor:

```ts
export function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
```

For string keys, empty and missing are the same thing, so an optional feature turns off by leaving the 1Password field blank. Bool keys are the exception (section 11). Call sites read `BUSINESS_*`, `LEAD_NOTIFICATION_EMAIL` (`src/lib/business.ts:12-28`), `CRM_TRANSPORT`, `CRM_RELAY_URL`, `CRM_RELAY_SECRET`, `OUTBOX_JOB_TOKEN`, `TURNSTILE_SECRET`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_CALENDLY_URL`, `NEXT_PUBLIC_SITE_URL`. `BUSINESS_NAME` is the one mandatory key; a missing value throws at build time (`src/lib/business.ts:13-17`).

`NEXT_PUBLIC_*` keys are inlined into the static export at build time by Next.js, so they must be present when `pnpm build` runs, locally through `with-env.sh` and in CI through the build job's `op run`. The two direct `process.env[...]` reads (`src/app/(site)/scope-of-appointment/page.tsx:37`, `src/components/seo/json-ld.tsx:13`) exist because Next.js only inlines a literal `process.env.NEXT_PUBLIC_X` access.

### Terraform

`infra/variables.tf` declares 27 variables with uppercase names matching the `TF_VAR_` keys, for example `variable "NAME"` (`variables.tf:1`), `variable "DNS_EXTRA_RECORDS"` as `map(object)` (`variables.tf:55-71`). Terraform parses the string value of `TF_VAR_DNS_EXTRA_RECORDS` as HCL, so the 1Password field holds `{}` or a map literal. Resources reference them as `var.NAME`, `var.LAMBDA_MEMORY_MB`, `var.TURNSTILE_SECRET` (`infra/compute.tf:12,17,36`). Validation blocks reject bad values at plan time (`variables.tf:4-8,17-21,44-48`).

Local plan, straight from the README (`README.md:71`):

```sh
op run --env-file=app.env -- terraform -chdir=infra plan
```

This resolves the whole file, including `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, which is how local Terraform authenticates. The backend is S3 with a lockfile (`infra/backend.tf:1-9`). Not run during this write-up.

## 7. How it is checked

### `tests/scripts/app-env.test.ts` (Vitest, project `unit`)

Fifteen assertions. Six run once per file, for `app.env` and then `app.dev.env` (`tests/scripts/app-env.test.ts:28-103`), and three compare the two files (`:105-137`). Each per-file assertion checks the file against `infra/variables.tf`:

1. The `TF_VAR_` set equals the `variable "X"` set, and there are 27.
2. Keys are unique and in ASCII order.
3. Every line matches `^[A-Z][A-Z0-9_]*="op:\/\/[^"]+"$`.
4. Each duplicated pair (`BUSINESS_NAME` vs `TF_VAR_BUSINESS_NAME`, `NEXT_PUBLIC_GTM_ID` vs `TF_VAR_GTM_ID`, `AWS_REGION` vs `TF_VAR_REGION`, and so on) points at the same reference.
5. The deploy build regex selects exactly the 10 build keys.
6. The local deny regex strips every `TF_VAR_` and leaves only `AWS_REGION` of the `AWS_*` keys.

The three cross-file assertions:

7. `app.dev.env` has the same keys as `app.env` in the same order.
8. Every `app.dev.env` key outside the AWS fields points at the Dev item.
9. The four keys whose field is `AWS_*` (`AWS_ACCESS_KEY_ID`, `AWS_REGION`, `AWS_SECRET_ACCESS_KEY`, `TF_VAR_REGION`) keep the same reference as in `app.env`.

Run: `pnpm exec vitest run tests/scripts/app-env.test.ts`. Also part of `pnpm test:unit`, the pre-commit and pre-push hooks (`lefthook.yml:68-69,112-113`) and CI (`ci.yml:73`).

Known limit, stated in the test itself (`app-env.test.ts:24`): the two regexes are copied from `deploy.yml` and `with-env.sh`. If someone edits a regex in one place and not the other, this test does not notice.

### `scripts/app-env.test.sh` (shell)

Runs `with-env.sh` in a temp directory with a stub `op` on `PATH` that captures the env file it was given and execs the command (`app-env.test.sh:17-29`). Cases (`:53-108`):

- stray `.env` refused (exit 1)
- stray `.env.local` refused (exit 1)
- missing `app.env` refused (exit 1)
- `op run` succeeds, no `TF_VAR_` line, no `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` line, exactly one `AWS_REGION` line in the captured file, no Dev item reference, and the temp file is gone afterwards
- missing `app.dev.env` refused for `APP_ENV=dev` (exit 1)
- `APP_ENV=dev` succeeds, passes the Dev item, exactly one `AWS_REGION` line and no `TF_VAR_` line
- `APP_ENV=prod` succeeds, and an empty `APP_ENV` selects prod with no Dev item
- `APP_ENV=staging` exits 1 with `with-env: APP_ENV must be prod or dev`
- with `CI=true` and a stray `.env`, the script execs the command and exits 0

Run: `bash scripts/app-env.test.sh`. Runs in CI (`ci.yml:70`). It is not in the lefthook hooks.

### Deploy-time guards

- Plaintext guard before each `op run` (`deploy.yml:132,268,411`).
- `pnpm docs:check` fails a commit when the generated key list in `README.md:75-84` no longer matches `app.env` (`scripts/generate-doc-sections.mjs:42-78`, hook at `lefthook.yml:78-80`).

## 8. Test results, including a mutation check

Both tests pass on the current tree:

```text
$ bash scripts/app-env.test.sh
ℹ️ app-env.test.sh passed
$ pnpm exec vitest run tests/scripts/app-env.test.ts
 Test Files  1 passed (1)
      Tests  15 passed (15)
```

To prove they are not vacuous, one expectation in each was changed, the tests were run, and the change was reverted. Working tree is clean afterwards.

Mutation 1: `tests/scripts/app-env.test.ts:35`, `toHaveLength(27)` to `toHaveLength(28)`:

```text
 FAIL  |unit| tests/scripts/app-env.test.ts > app.env > has a TF_VAR_ key for every Terraform variable and no others
 FAIL  |unit| tests/scripts/app-env.test.ts > app.dev.env > has a TF_VAR_ key for every Terraform variable and no others
AssertionError: expected [ 'NAME', 'REGION', …(25) ] to have a length of 28 but got 27
      Tests  2 failed | 13 passed (15)
```

Mutation 2: `scripts/app-env.test.sh:55`, expected exit code `1` to `0` for the stray `.env` case:

```text
❌ stray .env refused: expected 0, got 1
```

`shellcheck scripts/with-env.sh scripts/app-env.test.sh` exits 0.

## 9. Gaps found during this review

None were changed. Listed so they are not mistaken for intent.

- The GitHub repository still holds variables from the earlier design (`ASSETS_BUCKET`, `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `BUSINESS_*`, `CLOUDFRONT_ID`, `LAMBDA_FUNCTION_NAME`, `MIGRATE_FUNCTION_NAME`, all dated 2026-10-05). No workflow references `vars.` any more. They are dead and could be deleted.
- No job in `deploy.yml` declares `environment:`, because the default OIDC subject template would then end in `environment:<name>` instead of `ref:refs/heads/<branch>` and break the branch-based trust policy (`infra/iam.tf:84`). The GitHub environment `dev` exists but is unused, and `OP_SERVICE_ACCOUNT_TOKEN` stays a repository secret that anyone with write access can read by editing a workflow on a branch.
- `--no-masking` is passed to `op run` in the build, plan and verify-serving steps (`deploy.yml:134,270,413`), so a resolved value that the child prints would reach the job log. Why it was chosen is not recorded anywhere in the repo.
- The app.env key `AWS_ACCESS_KEY_ID` points at a 1Password field labelled `AWS_SECRET_KEY_ID` (`app.env:1`). It works, the label is just misleading.
- `AWS_REGION` and `TF_VAR_REGION` come from 1Password, while `deploy.yml:29` and `infra/backend.tf:5` hard-code `us-east-1`. Changing the field alone would not move the stack.
- The regex duplication noted in section 7.

## 10. Reusing the pattern in another site

Order matters: the 1Password side must exist before the first deploy, because a push to `main` deploys.

1. In 1Password, create one item per project in a vault the project owns. Add one field per key, label equal to the key without `TF_VAR_` or `NEXT_PUBLIC_`. Put infra sizing values (`NAME`, `REGION`, `LAMBDA_MEMORY_MB`, …) in the same item. Keep shared cloud credentials in a separate item.
2. Create a 1Password service account with read access to that vault only. Store its token as the GitHub repository secret `OP_SERVICE_ACCOUNT_TOKEN`. Prefer an environment-scoped secret with reviewers.
3. Copy `app.env` and rewrite every reference to the new vault and item. Keep it sorted (`LC_ALL=C sort -c app.env` must be silent), one `KEY="op://…"` per line, no comments. Add a `TF_VAR_` line for every `variable` in `infra/variables.tf` and nothing else. Add every `NEXT_PUBLIC_` key the frontend inlines.
4. Copy `scripts/with-env.sh` unchanged. Adjust the deny regex on line 21 only if the project has credential keys with other names.
5. Wrap every package script that needs env with `sh scripts/with-env.sh …` as in section 4. Leave pure tool scripts unwrapped.
6. Add `.env` and `.env.*` to `.gitignore`. Delete any `.env.example`.
7. Copy `tests/scripts/app-env.test.ts`. Update the duplicated-pair list and the expected build key list to the new project's keys. Copy `scripts/app-env.test.sh` unchanged.
8. In the deploy workflow, copy the three-line pattern from section 5 for each job: plaintext guard, `grep` the slice, `op run --env-file=<slice> -- env -u OP_SERVICE_ACCOUNT_TOKEN <command>`. Set `OP_SERVICE_ACCOUNT_TOKEN` on the step, not the job. Install the CLI with `1password/install-cli-action` first.
9. Give Terraform cloud credentials through OIDC in CI, never through `app.env`. Keep `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `app.env` only for the local plan, and keep them in the local deny filter.
10. In CI for pull requests, set the few literals the tests need in the workflow `env:` block and rely on `CI` being set so `with-env.sh` execs through.
11. Wire `bash scripts/app-env.test.sh` and the Vitest test into CI and the pre-commit hook.
12. Before merging, confirm every field exists with labels only, no values:

    ```sh
    op item get "<item>" --vault "<vault>" --format json | jq -r '.fields[].label' | sort -u >/tmp/have.txt
    grep -o 'op://<vault>/<item>/[^"]*' app.env | sed 's#.*/##' | sort -u >/tmp/want.txt
    comm -13 /tmp/have.txt /tmp/want.txt
    ```

    Empty output means nothing is missing. Then run the local plan from section 6 and expect zero changes for an existing stack.

## 11. The dev environment

The same code deploys a second, independent stack from the `develop` branch. Everything that differs is in the env file and three workflow outputs.

| Thing          | prod                                            | dev                                                 |
| -------------- | ----------------------------------------------- | --------------------------------------------------- |
| Branch         | `main`                                          | `develop`                                           |
| Env id         | `prod`                                          | `dev`                                               |
| Env file       | `app.env`                                       | `app.dev.env`                                       |
| 1Password item | `Legacy Benefits Group`                         | `Legacy Benefits Group Dev`                         |
| `NAME`         | `legacybenefitsgroup`                           | `legacybenefitsgroup-dev`                           |
| `DOMAIN_NAME`  | `legacybenefitsmn.com`                          | `dev.legacybenefitsmn.com`                          |
| State key      | `terraform.tfstate`                             | `dev/terraform.tfstate`                             |
| IAM roles      | `legacybenefitsgroup-github-{deploy,terraform}` | `legacybenefitsgroup-dev-github-{deploy,terraform}` |

- `app.dev.env` has the same keys as `app.env`, in the same order, and the same rules apply (section 2). Only the item inside each reference changes.
- Four keys keep a field on the shared prod item in both files, because the AWS account and region are shared: `AWS_ACCESS_KEY_ID`, `AWS_REGION`, `AWS_SECRET_ACCESS_KEY` and `TF_VAR_REGION`. Do not repoint them at the Dev item.
- Dev sets `TF_VAR_BASIC_AUTH_USER` and `TF_VAR_BASIC_AUTH_PASSWORD`, so CloudFront asks for a login on page requests. `/api/*` stays open. Prod leaves both empty.
- Dev's relay URL is the site's own CloudFront, so the transport sends `x-relay-secret` and `x-amz-content-sha256` besides the bearer: CloudFront's origin access control replaces `Authorization` and requires the payload hash.
- `TF_VAR_CRM_INBOX_ENABLED` must be the literal `true` or `false`, never blank, because Terraform types it as a bool (`infra/variables.tf:177`). `TF_VAR_BASIC_AUTH_USER` and `TF_VAR_BASIC_AUTH_PASSWORD` are both set or both blank; a validation rejects one without the other (`infra/variables.tf:195`).
- Locally, `APP_ENV=prod|dev` selects the file for `scripts/with-env.sh` (`scripts/with-env.sh:4-11`). The default is `prod`, any other value exits 1. Example: `APP_ENV=dev pnpm dev`.
- Local Terraform against dev needs the dev env file and the dev state key. `-reconfigure` makes Terraform drop the cached prod backend settings:

  ```sh
  op run --env-file=app.dev.env -- terraform -chdir=infra init -reconfigure -backend-config="key=dev/terraform.tfstate"
  op run --env-file=app.dev.env -- terraform -chdir=infra plan
  ```

  Run the same `init` without `-backend-config` and with `app.env` to switch back to prod.

- In CI the `resolve` job derives all of this from the branch (section 5), so nothing about dev is configured in GitHub except the existing repository secret.
