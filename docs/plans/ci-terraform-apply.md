# CI builds, applies Terraform, then hosts the app

Branch `feat/ci-terraform-apply` (base `143bd97`). Worktree `/Users/mj/repos/legacy-benefits-mn-ci-terraform`.
Marks: LIVE = changes a real external system. UNVERIFIED = not proven read-only; each has a stated check or fallback.

## Goal

On every push to main the Deploy workflow runs, in this order and with no laptop step:

1. quality, then build the site and API bundle (build only needs 1Password values).
2. `terraform plan`, a destroy guard, `terraform apply` of the AWS architecture, against state kept in S3.
3. deploy: upload releases, run migrations, update Lambda code, sync the static site to S3, invalidate CloudFront, verify.

A broken build never touches AWS. A bad plan never reaches deploy. Terraform state leaves the laptop. Everything added is free or fractions of a cent.

## Decisions (rulings)

Where all three expert designs agreed, adopted as is:

- Stop managing GitHub variables from Terraform. Delete `infra/github.tf` and the `integrations/github` provider. `GITHUB_TOKEN` has no variables scope (the `permissions:` key lists actions, artifact-metadata, attestations, checks, code-quality, contents, deployments, discussions, id-token, issues, packages, pages, pull-requests, security-events, statuses, vulnerability-alerts; docs.github.com workflow-syntax). Any alternative needs a long-lived PAT or App, and the build-before-apply order makes it circular.
- Build values come straight from 1Password (the same fields Terraform uses). AWS-derived values come from `terraform output` in the apply job.
- 1Password via `op` CLI and a read-only service account on a dedicated vault, not `1password/load-secrets-action` (it masks every loaded value, so the project name and region would be hidden in all logs).
- CI Terraform role is `AdministratorAccess`, trust limited to `refs/heads/main`. This stack creates IAM roles, an OIDC provider, VPC, RDS, CloudFront, ACM, Route53, SES, Lambda; any role that can create roles is admin anyway, so a scoped policy is false comfort. Laptop identity is already admin.
- No PR plan job and no PR AWS role (a PR plan would expose the 1Password token and state to PR code). PRs keep fmt, validate, tflint, trivy.
- Destroy guard: the plan fails the job if it deletes or replaces any address not in `infra/destroy-allowlist.txt`.
- S3 native locking (`use_lockfile = true`), no DynamoDB.

Where they disagreed, decided:

- Ruling (owner): every project owns separate resources; nothing is shared with mccor-labs except the account-wide GitHub OIDC provider, which neither repo manages. State lives in the dedicated bucket `legacybenefitsgroup-tfstate-150701180133`, key `terraform.tfstate`, created once with the AWS CLI on 2026-10-05: versioning, SSE-S3 with bucket key, full public access block, TLS-only bucket policy, noncurrent versions expire after 90 days. It is not managed by Terraform, so a destroy of this stack cannot delete its own state. Backend uses `use_lockfile` and `encrypt`.
- Ruling: CI role is defined in the main root (`infra/iam.tf`), created once by a targeted laptop apply, then managed by CI like everything else (cost if wrong: move it to a separate root later). No `prevent_destroy`; the destroy guard is the single mechanism (a deletion of the role or OIDC provider is not in the allowlist, so CI fails before applying). Laptop admin keys stay as break-glass.
- Ruling: job outputs, not an artifact, carry Terraform outputs to the deploy job (cost if wrong: swap to an artifact, about 15 minutes). Evidence: the pinned `configure-aws-credentials` (`e1253824...` = v6.3.0) documents `mask-aws-account-id` as "By default the account ID will not be masked", so bucket and role ARN (which contain the account id) are not dropped, and `op run --no-masking` registers no masks. The apply job fails if any output is empty, so a dropped output cannot pass silently.
- Ruling: `op run` in the build step, no separate config job (cost if wrong: add a job). The token is set only on that step and removed from the child with `env -u OP_SERVICE_ACCOUNT_TOKEN`, so `pnpm build` never sees it.
- Ruling: build before apply is safe because `NEXT_PUBLIC_SITE_URL` is `https://${domain_name}` whenever `domain_name` is set (`infra/main.tf:36`). The build fails fast if `domain_name` is empty, and the deploy job refuses to sync if `terraform output site_url` differs from the URL the build baked in.
- Ruling: `terraform state rm 'github_actions_variable.this'` once, during migration, rather than a `removed {}` block (cost if wrong: none; the `removed` form needs provider behaviour I did not verify). The 13 repo variables stay in GitHub, unused, until the owner deletes them.
- Ruling: apply job checks out `github.sha` (main HEAD), never `inputs.ref`. A `workflow_dispatch` redeploy of an old SHA rebuilds the old app against current 1Password values and current infra; it never rolls infra back (cost if wrong: an old app needing old infra; revert on main instead).
- Ruling: no `plan_only` input (cost if wrong: add a boolean input and an `if:` on apply; 10 minutes). Preview is the laptop `terraform plan` against the same S3 state, and the guard fails closed.
- Ruling: no `actor_id` or `job_workflow_ref` trust conditions (cost if wrong: one trust-policy edit). Free private repos have no branch protection (403 "Upgrade to GitHub Pro" per all three designs), so these would not stop the owner's own account being compromised, and the `job_workflow_ref` value for a plain workflow is UNVERIFIED.
- Ruling: apply job runs on `ubuntu-latest` x64, like the proven `ci.yml:121-157` terraform job; build and deploy stay on `ubuntu-24.04-arm` (cost if wrong: change `runs-on`). Avoids provider lock-hash and arm-installer unknowns for the one job that matters. `1password/install-cli-action` v4.1.0 `dist/index.js` contains `arm64` handling (grep), so the arm build job should work; UNVERIFIED until the first run, fallback is `runs-on: ubuntu-latest` for build.
- Ruling: role session 7200 seconds (role `max_session_duration = 7200`, `role-duration-seconds: 7200`) because the first run replaces Aurora and updates CloudFront (cost if wrong: raise both numbers).
- Ruling: guard is a committed script `scripts/plan-guard.sh` with a fixture test run in `ci.yml`, not inline YAML (cost if wrong: inline it). It has branching logic on a safety path, so it gets one runnable check.
- Ruling: first apply (including the Aurora replace) happens in CI, with the allowlist generated from the pre-merge plan and emptied in a follow-up (cost if wrong: partial apply on a long run; rerun is idempotent and the laptop `ta` works against the same state).
- Ruling: service-account token has no expiry, rotated by hand (cost if wrong: leaked token valid until rotated; an expiry risks a silent CI outage).
- Ruling: no manual Aurora snapshot (owner said no real leads). The state records `skip_final_snapshot = true` and `deletion_protection = false` for the old cluster, so the destroy half takes no snapshot; the baseline plan task confirms it.

## Costs

Nothing here is paid. For discussion:

- S3 state: about 190 KB per version, 90-day noncurrent expiry. Even 300 versions is under $0.002 per month at $0.023 per GB; lock-file requests are $0.005 per 1,000. Effectively free, not literally $0. The account has a budget named "My Zero-Spend Budget" (reported by one design, not re-checked) that may email on the first billed cent.
- IAM role, policy attachment, OIDC provider, extra 1Password vault: free. SSE-S3 free; no KMS key (a CMK would be about $1 per month and is not used).
- 1Password service account: no charge found in the docs for Individual, Families, Teams, Business. The account is Families. Whether Families can create one is UNVERIFIED (the CLI command exists, and a service-account token item already sits in Development, which suggests yes). If creation is refused, the only fallbacks cost money (Teams) or break the owner's rule (secrets copied into GitHub); stop and tell the owner.
- 1Password rate limit on Families: 1,000 reads per hour per token, 1,000 per 24 hours shared across all service accounts on the account (www.1password.dev/service-accounts/rate-limits). A run reads about 21 refs (plan) plus 9 (build), about 30, so about 30 runs per day. A 429 fails the job before any apply. Measure with `op service-account ratelimit`.
- GitHub Actions: private repo on Free has 2,000 included minutes per month (from memory, UNVERIFIED). Current usage is about 55 to 90 minutes per month with arm minutes shown at net $0. This adds about 3 to 5 minutes per push (x64) and 20 to 60 minutes on the first run. The default $0 spending limit blocks runs rather than billing.
- AWS resources already in code (Aurora Serverless v2 at min 0 ACU, CloudFront OAC, headers policy): no new fixed cost.
- Not in this design because it would cost: GitHub Pro for branch protection and environment approvals ($4 per month), HCP Terraform, DynamoDB, KMS CMK.

## Owner prerequisites

Only these. Everything else is done by the orchestrator in the worktree.

1. 1Password and GitHub secret (task T2, LIVE). Run from a terminal where `op` and `gh` are signed in (replace nothing; `!` prefix inside Claude Code works):

   ```
   op vault create legacy-benefits-mn-ci
   op item move xfaph2wkwtqfzbn7pbzlgdjxyi --current-vault Development --destination-vault legacy-benefits-mn-ci
   op item get legacy-benefits-mn-infra --vault legacy-benefits-mn-ci --format json | jq -r .id
   ```

   `op item move` creates a copy with a NEW item id and sends the original to Recently Deleted (op's own help text), so record the printed id and give it to the orchestrator. Then create the service account without printing the token:

   ```
   TOKEN=$(op service-account create legacy-benefits-mn-ci --vault legacy-benefits-mn-ci:read_items --raw)
   OP_SERVICE_ACCOUNT_TOKEN=$TOKEN op read "op://legacy-benefits-mn-ci/<NEW_ID>/domain_name"
   OP_SERVICE_ACCOUNT_TOKEN=$TOKEN op read "op://Development/26uakebwqlfwhajd3ba3mpb34y/username"
   printf %s "$TOKEN" | gh secret set OP_SERVICE_ACCOUNT_TOKEN --repo marc-mccarthy/legacy-benefits-mn
   unset TOKEN
   ```

   The first read must print the domain; the second must fail (the token cannot reach the admin AWS keys in Development). If the CLI refuses on Families, use the web UI (labels from memory, UNVERIFIED): my.1password.com, Developer in the left sidebar, Infrastructure Secrets, Service Accounts, Create Service Account, name `legacy-benefits-mn-ci`, add vault `legacy-benefits-mn-ci` with Read, Create, copy the token once; then GitHub, repo `marc-mccarthy/legacy-benefits-mn`, Settings, Secrets and variables, Actions, New repository secret, name `OP_SERVICE_ACCOUNT_TOKEN`.

2. Push the branch, open the PR, merge it (task T10). Agents never push.

Later, only on the owner's approval (removals, not prerequisites): delete the 13 unused repo variables, delete the stale local `infra/terraform.tfstate` and `.backup` in the main checkout.

## Ordered tasks

Conventions: `$S` is the session scratchpad. `OPRUN` means `op run --no-masking --env-file=terraform.env --` run in the named `infra/` directory. Plan summaries contain addresses and actions only, never values. No comments in any file touched. Commits are one per task, staging only that task's paths, after the owner approves this plan.

### T1. Baseline plan against the old local state (read-only, no AWS change)

- Directory: `/Users/mj/repos/legacy-benefits-mn/infra` (main checkout, local backend, commit `143bd97`). Must run before T2 because its `terraform.env` points at the old 1Password item.
- Commands:
  ```
  jq '{serial,lineage,n:([.resources[].instances|length]|add)}' terraform.tfstate
  shasum -a 256 terraform.tfstate
  OPRUN terraform plan -lock=false -input=false -out=$S/base.tfplan
  terraform show -json $S/base.tfplan | jq -S '[.resource_changes[]|select(.change.actions!=["no-op"])|{a:.address,x:.change.actions}]' > $S/base.json
  terraform show -json $S/base.tfplan | jq '.resource_changes[]|select(.address=="aws_rds_cluster.this")|.change.before|{storage_encrypted,deletion_protection,skip_final_snapshot}'
  ```
- Expected: serial 280, lineage `d89984f0-0124-8c47-52ed-85616482366b`, n 83; the last command prints `skip_final_snapshot: true`, `deletion_protection: false`, `storage_encrypted: false`; `base.json` lists `aws_rds_cluster.this` and `aws_rds_cluster_instance.this` with `["delete","create"]` plus the in-place pending changes and the 13 `github_actions_variable` rows if any drift.
- Live AWS: no (refresh only; `-lock=false`, `-out` outside the repo). Rollback: none needed. `shasum` proves the local file was not touched.

### T2. 1Password vault, service account, GitHub secret (LIVE: 1Password and GitHub secret)

- Owner prerequisite 1 above.
- Verify: `gh secret list --repo marc-mccarthy/legacy-benefits-mn` shows `OP_SERVICE_ACCOUNT_TOKEN`; the `op read` pair behaved as stated.
- Side effect: the main checkout's `ta` breaks until it pulls the new `terraform.env` (old item id).
- Rollback: `op item move <NEW_ID> --current-vault legacy-benefits-mn-ci --destination-vault Development` (another new id), or restore the original from Recently Deleted; delete the service account in the web UI (removal, ask owner).

### T3. Code: S3 backend, GitHub removal, env files

- Files:
  - New `infra/backend.tf`:
    ```
    terraform {
      backend "s3" {
        bucket       = "legacybenefitsgroup-tfstate-150701180133"
        key          = "terraform.tfstate"
        region       = "us-east-1"
        use_lockfile = true
        encrypt      = true
      }
    }
    ```
  - Delete `infra/github.tf`. In `infra/main.tf:8` remove the `github` line from `required_providers`. In `infra/variables.tf` remove `github_repository` (lines 41-48) and `manage_github_variables`; keep `github_subject_prefix` (used at `infra/iam.tf:77`).
  - `infra/outputs.tf`: add `output "business_name" { value = var.business_name }` (the deploy content check needs it).
  - `infra/terraform.env`: in the lines that use item `xfaph2wkwtqfzbn7pbzlgdjxyi`, replace vault `Development` and the item id with `legacy-benefits-mn-ci` and `<NEW_ID>` (including the `AWS_REGION` line); leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` on `Development/26uakebwqlfwhajd3ba3mpb34y`; delete the `TF_VAR_github_repository` and `TF_VAR_manage_github_variables` lines.
  - New `infra/build.env` (nine refs, same item, same quoting as `terraform.env`): `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (field `turnstile_site_key`), `NEXT_PUBLIC_GTM_ID` (`gtm_id`), `NEXT_PUBLIC_CALENDLY_URL` (`calendly_url`), `NEXT_PUBLIC_MEDIA_HOST` (`media_host`), `BUSINESS_NAME`, `BUSINESS_PHONE`, `BUSINESS_EMAIL`, `BUSINESS_ADDRESS`, `DOMAIN_NAME` (`domain_name`).
  - `infra/.terraform.lock.hcl`: after `terraform init`, check `git diff`; if the `integrations/github` stanza is still there, delete it by hand (init may or may not prune it, UNVERIFIED).
- Verify (worktree, `infra/`):
  ```
  terraform fmt -check -recursive
  terraform init -backend=false -input=false && terraform validate
  grep -n github *.tf
  tflint --init && tflint
  trivy config --ignorefile ../.trivyignore.yaml --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
  op run --no-masking --env-file=terraform.env -- true
  op run --no-masking --env-file=build.env -- sh -c 'test -n "$DOMAIN_NAME" && test -n "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" && echo ok'
  ```
  Expected: fmt silent; "Success! The configuration is valid."; grep shows only `github_subject_prefix` lines and the OIDC provider URL; tflint and trivy exit 0; both `op run` calls exit 0 and the last prints `ok`.
- Live AWS: no. Rollback: `git checkout` the files.

### T4. State migration into S3 (LIVE: creates one S3 object)

- Window rule: from the push until cutover nobody runs `ta`, `terraform apply` or CI.
- Directory: worktree `infra/`, laptop AWS keys from `terraform.env`.
  ```
  OPRUN terraform init -input=false
  OPRUN terraform state push /Users/mj/repos/legacy-benefits-mn/infra/terraform.tfstate
  OPRUN terraform state pull | jq '{serial,lineage,n:([.resources[].instances|length]|add)}'
  diff <(jq -S . /Users/mj/repos/legacy-benefits-mn/infra/terraform.tfstate) <(OPRUN terraform state pull | jq -S .)
  OPRUN terraform state rm 'github_actions_variable.this'
  OPRUN terraform state list | grep -c github_actions_variable
  aws s3api list-object-versions --bucket legacybenefitsgroup-tfstate-150701180133 --prefix terraform.tfstate --query 'Versions[].VersionId'
  OPRUN terraform plan -input=false -out=$S/new.tfplan
  terraform show -json $S/new.tfplan | jq -S '[.resource_changes[]|select(.change.actions!=["no-op"])|{a:.address,x:.change.actions}]' > $S/new.json
  jq -n --slurpfile b $S/base.json --slurpfile n $S/new.json '$b[0]-$n[0]|map(.a)|unique'
  jq -n --slurpfile b $S/base.json --slurpfile n $S/new.json '$n[0]-$b[0]'
  ```
- Expected: init reports the s3 backend configured with an empty remote and asks no copy question (it uses `state push`, which never touches the local file); pull shows serial 280, the same lineage, n 83; the diff is empty; after `state rm` the grep count is 0 and the list shrinks by 13; the version query shows two versions at most (push, then `state rm`); the `$b-$n` jq prints exactly the `github_actions_variable.this` instances; the `$n-$b` jq prints `[]`. Any other difference: stop.
- UNVERIFIED: `state rm` runs without the github provider in configuration. Fallback: `terraform state pull | jq 'del(.resources[]|select(.type=="github_actions_variable"))|.serial+=1' > $S/pruned.json` then `terraform state push $S/pruned.json` (scratch file, not a backup; the local original is untouched).
- Live AWS: only the state object in S3. Rollback before the first CI apply: delete `infra/backend.tf` locally and the local file in the main checkout is still the authoritative state (it was never written). To clear S3, delete the object (removal, ask owner). After CI has applied once there is no going back to the local file; roll forward, or restore an earlier S3 version with `aws s3api copy-object --copy-source "legacybenefitsgroup-tfstate-150701180133/terraform.tfstate?versionId=<id>"` onto the same key.

### T5. Code: CI Terraform role

- Files: `infra/iam.tf`. Rename `data.aws_iam_policy_document.deploy_assume` to `github_main_assume` (update its one use in `aws_iam_role.deploy`) and add:
  ```
  resource "aws_iam_role" "terraform" {
    name                 = "${var.name}-github-terraform"
    assume_role_policy   = data.aws_iam_policy_document.github_main_assume.json
    max_session_duration = 7200
  }

  resource "aws_iam_role_policy_attachment" "terraform_admin" {
    role       = aws_iam_role.terraform.name
    policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  }
  ```
  The trust is therefore identical to the deploy role: `aud = sts.amazonaws.com`, `sub = ${github_subject_prefix}:ref:refs/heads/main` (`infra/iam.tf:59-80`).
- Verify: `terraform fmt -check`, `terraform validate`, tflint, and the T3 trivy command. Trivy may flag the admin attachment; if it does, add one ignore entry to `.trivyignore.yaml` with a one-line `statement` naming this ruling (a `statement` is a data field, not a code comment). Plan must show exactly 2 creates (role, attachment) and the data-source rename produces no resource change.
- Live AWS: no. Rollback: `git checkout infra/iam.tf`.

### T6. Create the CI role (LIVE: IAM, free)

- From worktree `infra/` against the S3 state:
  ```
  OPRUN terraform apply -target=aws_iam_role.terraform -target=aws_iam_role_policy_attachment.terraform_admin
  aws iam get-role --role-name legacybenefitsgroup-github-terraform --query 'Role.[MaxSessionDuration,AssumeRolePolicyDocument.Statement[0].Condition]'
  aws iam list-attached-role-policies --role-name legacybenefitsgroup-github-terraform
  ```
- Expected: "Apply complete! Resources: 2 added, 0 changed, 0 destroyed."; `7200` and the two conditions above; `AdministratorAccess` attached. The `-target` warning is expected and one-time.
- Rollback: `terraform destroy -target` of the same two addresses (removal, ask owner).

### T7. Code: destroy guard

- Files:
  - `scripts/plan-guard.sh` (reads `terraform show -json` on stdin, allowlist path as `$1`, prints addresses only):
    ```
    #!/usr/bin/env bash
    set -euo pipefail
    allow="${1:?allowlist path}"
    changed=$(jq -r '.resource_changes[]? | select(.change.actions | index("delete")) | .address')
    bad=$(comm -23 <(printf '%s\n' "$changed" | sort -u) <(sort -u "$allow"))
    if [ -n "$bad" ]; then
      echo "::error::plan deletes or replaces resources outside the allowlist:" >&2
      echo "$bad" >&2
      exit 1
    fi
    ```
  - `scripts/plan-guard.test.sh` with four inline JSON fixtures and an `assert` per case: a delete outside the allowlist exits 1; the same address in the allowlist exits 0; a replace (`["delete","create"]`) outside the list exits 1; `{}` (no `resource_changes`) exits 0.
  - Empty `infra/destroy-allowlist.txt` (no comment lines allowed, so one address per line only).
  - `ci.yml` terraform job: add a step `run: bash scripts/plan-guard.test.sh` and `chmod +x` both scripts in git.
- Verify: `bash scripts/plan-guard.test.sh` exits 0 and prints no failure; `shellcheck scripts/plan-guard.sh` if installed (otherwise skip, it is not a repo dependency).
- Live AWS: no. Rollback: `git checkout`.

### T8. Code: workflows

Files `.github/workflows/deploy.yml` and `.github/workflows/ci.yml` (ci.yml change is only the T7 step). New action pins, resolved against the API: `1password/install-cli-action@1a3160d5e9de1ae0803eaa08a88746f5ae3daa50` (v4.1.0, tag object `f800e0b6...` dereferenced to this commit); `aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd` (v6.3.0, already used at `deploy.yml:202`); `hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd` (already at `ci.yml:129`).

Exact changes to `deploy.yml`:

1. Top-level env (line 21): `AWS_REGION: us-east-1` (literal; the backend block cannot take variables and `infra/dns.tf` already hardcodes us-east-1 for ACM). Remove every `vars.*` reference (18 today).
2. `build` job: after `pnpm install`, add the install step and replace the Build step (lines 93-105):
   ```
   - uses: 1password/install-cli-action@1a3160d5e9de1ae0803eaa08a88746f5ae3daa50

   - name: Build
     id: build
     env:
       NEXT_TELEMETRY_DISABLED: "1"
       OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
     run: |
       set -euo pipefail
       op run --no-masking --env-file=infra/build.env -- env -u OP_SERVICE_ACCOUNT_TOKEN bash -c '
         test -n "$DOMAIN_NAME"
         export NEXT_PUBLIC_SITE_URL="https://$DOMAIN_NAME"
         echo "site_url=$NEXT_PUBLIC_SITE_URL" >>"$GITHUB_OUTPUT"
         exec pnpm build'
   ```
   Add `site_url: ${{ steps.build.outputs.site_url }}` to the job `outputs:` beside `key`. `scripts/with-env.sh` execs directly when `CI` is set, so `pnpm build` needs no change.
3. New job `terraform`, after `build`:
   ````
   terraform:
     needs: build
     runs-on: ubuntu-latest
     timeout-minutes: 120
     permissions:
       contents: read
       id-token: write
     env:
       TF_IN_AUTOMATION: "true"
       TF_INPUT: "0"
     outputs:
       region: ${{ steps.out.outputs.region }}
       site_url: ${{ steps.out.outputs.site_url }}
       assets_bucket: ${{ steps.out.outputs.assets_bucket }}
       cloudfront_distribution_id: ${{ steps.out.outputs.cloudfront_distribution_id }}
       lambda_function_name: ${{ steps.out.outputs.lambda_function_name }}
       migrate_function_name: ${{ steps.out.outputs.migrate_function_name }}
       deploy_role_arn: ${{ steps.out.outputs.deploy_role_arn }}
       business_name: ${{ steps.out.outputs.business_name }}
     steps:
       - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1

       - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd
         with:
           terraform_version: "1.16.1"
           terraform_wrapper: false

       - uses: 1password/install-cli-action@1a3160d5e9de1ae0803eaa08a88746f5ae3daa50

       - uses: aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd
         with:
           role-to-assume: arn:aws:iam::150701180133:role/legacybenefitsgroup-github-terraform
           aws-region: ${{ env.AWS_REGION }}
           role-duration-seconds: 7200

       - run: terraform -chdir=infra init

       - name: Plan
         env:
           OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
         run: |
           set -euo pipefail
           grep '^TF_VAR_' infra/terraform.env >"$RUNNER_TEMP/tf.env"
           op run --no-masking --env-file="$RUNNER_TEMP/tf.env" -- env -u OP_SERVICE_ACCOUNT_TOKEN \
             terraform -chdir=infra plan -lock-timeout=10m -out="$RUNNER_TEMP/tfplan"

       - name: Plan summary
         run: |
           {
             echo '```'
             terraform -chdir=infra show -no-color "$RUNNER_TEMP/tfplan"
             echo '```'
           } >>"$GITHUB_STEP_SUMMARY"

       - name: Guard
         run: terraform -chdir=infra show -json "$RUNNER_TEMP/tfplan" | scripts/plan-guard.sh infra/destroy-allowlist.txt

       - name: Apply
         run: terraform -chdir=infra apply -lock-timeout=10m "$RUNNER_TEMP/tfplan"

       - name: Outputs
         id: out
         run: |
           set -euo pipefail
           terraform -chdir=infra output -json >"$RUNNER_TEMP/out.json"
           for k in region site_url assets_bucket cloudfront_distribution_id lambda_function_name migrate_function_name deploy_role_arn business_name; do
             v=$(jq -er --arg k "$k" '.[$k].value' "$RUNNER_TEMP/out.json")
             test -n "$v"
             echo "$k=$v" >>"$GITHUB_OUTPUT"
           done
   ````
   The checkout takes the default `github.sha` (not `inputs.ref`). The AWS credentials flow into `op run` and `terraform` through the environment; the `AWS_*` lines of `terraform.env` are excluded by the `grep '^TF_VAR_'`, so static keys can never override OIDC. The saved plan stays in `RUNNER_TEMP`, is never uploaded, and `show -json` goes only into the guard pipe. `business_address` may be multi-line; it never goes through `$GITHUB_OUTPUT` (only `business_name`, which is single-line, does).
4. `deploy` job: `needs: [build, terraform]`; `env.BUCKET: ${{ needs.terraform.outputs.assets_bucket }}`; add as first step:
   ```
   - name: Check site URL
     env:
       BUILT: ${{ needs.build.outputs.site_url }}
       APPLIED: ${{ needs.terraform.outputs.site_url }}
     run: test "$BUILT" = "$APPLIED"
   ```
   `role-to-assume: ${{ needs.terraform.outputs.deploy_role_arn }}`; `FN: ${{ needs.terraform.outputs.migrate_function_name }}` (Migrate) and `lambda_function_name` (Update function); `DIST: ${{ needs.terraform.outputs.cloudfront_distribution_id }}`; `SITE: ${{ needs.terraform.outputs.site_url }}` in both verify steps; `BUSINESS_NAME: ${{ needs.terraform.outputs.business_name }}`.
5. Cleanup the owner asked for (current lines 256-257): add `--delete` to both:
   ```
   aws s3 sync public/media "s3://$BUCKET/media" --delete
   aws s3 sync public/video "s3://$BUCKET/video" --delete
   ```
   Safe: line 254 already excludes `media/*`, `video/*`, `releases/*`, `_next/static/*`; the `site` artifact carries the full `public/media` and `public/video`; the deploy role already has `s3:DeleteObject` (`infra/iam.tf:101`).
6. Keep `concurrency` (lines 13-15) with `cancel-in-progress: false` so a running apply is never killed; runs queue. The S3 lock plus `-lock-timeout=10m` makes a laptop apply and CI queue instead of racing.

- Verify:
  ```
  python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/deploy.yml .github/workflows/ci.yml
  grep -c 'vars\.' .github/workflows/deploy.yml
  docker run --rm -v "$PWD":/r -w /r rhysd/actionlint:latest -color
  git diff -U0 -- .github scripts infra | grep -nE '^\+\s*#' | grep -v '^\S*:\+#!/usr/bin/env'
  ```
  Expected: no YAML error; `0`; actionlint no findings (docker is installed at `/usr/local/bin/docker`; actionlint itself is not installed locally and is not installed by this plan); the last grep prints nothing (no new comment lines). Also confirm every `uses:` in the diff has a 40-character SHA.
- Live AWS: no. Rollback: `git checkout`.

### T9. Pre-merge dry run (read-only on AWS, no apply)

- From worktree `infra/` with all code in place:
  ```
  OPRUN terraform plan -input=false -out=$S/final.tfplan
  terraform show -json $S/final.tfplan | jq -r '.resource_changes[]|select(.change.actions|index("delete"))|.address' | sort -u > infra/destroy-allowlist.txt
  cat infra/destroy-allowlist.txt
  terraform show -json $S/final.tfplan | scripts/plan-guard.sh infra/destroy-allowlist.txt; echo $?
  : > $S/empty.txt; terraform show -json $S/final.tfplan | scripts/plan-guard.sh $S/empty.txt; echo $?
  terraform show -no-color $S/final.tfplan > $S/plan.txt
  grep -c -F "$(op read 'op://legacy-benefits-mn-ci/<NEW_ID>/turnstile_secret')" $S/plan.txt
  grep -c 'postgres://' $S/plan.txt
  ```
  `terraform show` runs with the same AWS env as OPRUN (admin keys), and the `op read` result goes straight into `grep -F`, never to the terminal.
- Expected: the allowlist holds exactly the delete addresses from the plan (expected `aws_rds_cluster.this` and `aws_rds_cluster_instance.this`, both `["delete","create"]`; compare with `base.json` from T1: same two, anything else is a stop and goes to the owner); guard prints `0` with the allowlist and exits `1` listing addresses with the empty file; both greps print `0` (Terraform redacts sensitive values in the text plan, so the Lambda `DATABASE_URL` and Turnstile secret do not leak into the log or step summary; if either prints non-zero, stop and mark that variable `sensitive`). The plan contains no role changes (T6 created it) and no `github_actions_variable` rows.
- Live AWS: no. Rollback: n/a.

### T10. Merge and first real run (LIVE: the big apply)

- Owner pushes the branch, opens the PR, merges (prerequisite 2). `ci.yml` runs on the PR (quality, e2e, terraform validate, tflint, trivy, guard test) and must be green first; its terraform job keeps `-backend=false` (`ci.yml:138`).
- Watch the first Deploy run: build, then terraform (plan, guard, apply: Aurora replace plus the in-place changes), then deploy.
- Verify after green (orchestrator, read-only):
  ```
  gh run list --workflow=Deploy --limit 1 --json conclusion,status
  aws rds describe-db-clusters --db-cluster-identifier legacybenefitsgroup --query 'DBClusters[0].[StorageEncrypted,DeletionProtection]'
  OPRUN terraform plan -detailed-exitcode -input=false
  aws s3api list-object-versions --bucket legacybenefitsgroup-tfstate-150701180133 --prefix terraform.tfstate --query 'length(Versions)'
  ```
  Expected: `completed` and `success`, including the existing "Verify serving" and "Verify signed POST" steps (`deploy.yml:266-312`); `[true, true]`; the local plan exits `0` ("No changes"); the version count grew by the CI writes. A second run (any docs push or `workflow_dispatch`) must show "No changes" in its plan summary and an empty destroy list.
- Failure behaviour: quality or build fails, nothing applies. Plan, guard or 1Password fails, nothing applies and deploy is skipped; the plan is in the step summary. Apply fails midway, state is saved per resource in S3, deploy is skipped, fix and re-run. Deploy fails after apply, re-run with `workflow_dispatch` (infra already converged). Stale lock after a killed runner or cancel: `terraform force-unlock <id>` from the laptop.
- Rollback: infra rolls forward only (revert commit on main; the guard blocks destroys unless allowlisted). The laptop admin keys remain break-glass.

### T11. Follow-up PR and cleanup

- Empty `infra/destroy-allowlist.txt`. Verify the next run still passes with no deletes.
- Docs: `README.md:97-98` ("Nothing in this repository applies it") and the infra notes under `docs/` need updating; show the exact text to the owner first (doc-edit rule).
- With owner approval only: `gh variable delete` the 13 unused variables; delete the stale local `infra/terraform.tfstate` and `.backup` in the main checkout (untracked, git cannot recover them, so list them and let the owner decide); delete the original item in 1Password Recently Deleted.
- Optional later, owner's call: `prevent_destroy` on `aws_route53_zone.this`, `aws_rds_cluster.this` and the assets bucket (`force_destroy = true` at `infra/main.tf:191`) as a second guard beside the allowlist.

## First-run expectations

- Aurora cluster `legacybenefitsgroup` is destroyed and recreated (`storage_encrypted` false to true forces replace; `infra/main.tf:154-169`). The old cluster has no snapshot (state value `skip_final_snapshot = true`, T1 proves it), so every row is lost; the owner accepted this. Both the cluster and the instance use the same identifier, so they replace destroy-first; expect 10 to 15 minutes. The new cluster has `deletion_protection = true` and `final_snapshot_identifier`, so any future delete is a two-step change.
- The app and migrate Lambdas get the new `DATABASE_URL` through Terraform; their code is not overwritten (`ignore_changes` on `filename` and `source_code_hash`, `infra/compute.tf:51` and `305`). Between apply and the deploy job's Migrate step the API hits an empty database; Migrate (`deploy.yml:221-239`) rebuilds the schema, running against a cluster that scales from 0 ACU, so the first call may wait on a resume (the invoke already allows 330 seconds).
- In the same apply: Node 24 runtimes, Function URL to `AWS_IAM` with CloudFront OAC, response headers policy, IAM trims, `releases/` lifecycle. The Function URL and the OAC origin update land as separate resources, so `/api/*` can return 403 for a few minutes. The Verify serving loop retries for 5 minutes (30 times, 10 seconds).
- Expected terraform job time 20 to 60 minutes on this run, 3 to 5 afterwards. The role session is 2 hours.
- The 13 `github_actions_variable` instances were removed from state in T4, so the plan does not mention them; the 13 repo variables remain in GitHub, unused.
- If an output is dropped or empty, the Outputs step fails the job before deploy.

## How the laptop flow changes

- `ta` (`op run --no-masking --env-file=terraform.env -- terraform apply`) keeps working: same backend block in code, same S3 state, AWS keys still the `AWS mj` item in Development, settings now read from the new vault. The S3 lock arbitrates against CI (the loser waits `-lock-timeout`, or fails fast on the laptop).
- One-time cutover per checkout: `git pull`, then `terraform init -reconfigure` (answer no to any copy prompt; never `-migrate-state`, which would try to overwrite S3 with the stale local file). The old checkout `/Users/mj/repos/legacy-benefits-mn/infra` still holds a stale `terraform.tfstate` and `.backup`; leave them until the owner decides.
- Day to day, merging to main is the deploy. Use `terraform plan` on the laptop to preview; do not apply from the laptop unless CI is broken.
- The main checkout's `terraform.env` points at the old, moved 1Password item until it pulls this branch.
