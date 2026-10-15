# GitHub Actions CI/CD setup guide (created 2026-10-14, updated 2026-10-14)

How to set up CI/CD for any repository on GitHub Actions, with 1Password for secrets: every check runs once, at the right level, with no wasted minutes. Facts are current as of 2026-10-14 and cited at the end.

## Contents

1. [How it works](#1-how-it-works)
2. [Where everything lives](#2-where-everything-lives)
3. [The pipeline](#3-the-pipeline)
4. [Set up the repository](#4-set-up-the-repository)
5. [The workflows](#5-the-workflows)
6. [Secrets, variables and 1Password](#6-secrets-variables-and-1password)
7. [Cloud access with OIDC](#7-cloud-access-with-oidc)
8. [Workflow syntax reference](#8-workflow-syntax-reference)
9. [Speed and waste](#9-speed-and-waste)
10. [Security checklist](#10-security-checklist)
11. [Billing](#11-billing)
12. [Troubleshooting](#12-troubleshooting)
13. [New and deprecated, 2025 to 2026](#13-new-and-deprecated-2025-to-2026)
14. [Sources](#14-sources)

## 1. How it works

GitHub Actions runs **workflows** (YAML files) when **events** happen in a repository. A workflow holds **jobs**; each job runs on its own fresh **runner** (a virtual machine) and is a list of **steps**. A step either runs a shell command (`run:`) or calls a reusable unit of code called an **action** (`uses:`).

| Term              | What it is                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Event             | What starts a workflow: a push, a pull request, a schedule, a manual button (`workflow_dispatch`) |
| Workflow          | One `.github/workflows/*.yml` file; one run per matching event                                    |
| Job               | A group of steps on one runner; jobs run in parallel unless linked with `needs`                   |
| Step              | One command or action inside a job; steps share the runner's file system                          |
| Runner            | The machine a job runs on: GitHub-hosted (fresh VM each job) or self-hosted                       |
| Action            | Reusable step code, referenced as `owner/repo@ref` (JavaScript, Docker or composite)              |
| Reusable workflow | A whole workflow called from another workflow's job with `uses:`                                  |
| Artifact          | Files a job uploads so a later job or a person can download them                                  |
| Cache             | Files kept between runs (dependency downloads) to save time                                       |
| Environment       | A named deploy target (`production`) with its own secrets and protection rules                    |
| Check             | A job's pass or fail result shown on a pull request; can be required before merge                 |

**CI** (continuous integration) checks every change before merge: lint, types, unit, integration and browser tests. **CD** (continuous delivery) builds and ships what was merged: build once, apply infrastructure, deploy, smoke-test.

## 2. Where everything lives

| Path                                                  | Purpose                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.github/workflows/*.yml`                             | Workflows. GitHub finds them automatically; no subfolders. Files over 500 KB do not run             |
| `.github/actions/<name>/action.yml`                   | Composite actions shared by this repo's workflows. Not auto-discovered; reference them with `uses:` |
| `.github/dependabot.yml`                              | Automatic update PRs for actions and packages                                                       |
| `.github/CODEOWNERS` (or root, or `docs/`)            | Who must review changes to which paths, such as `.github/workflows/`                                |
| `.env` (committed)                                    | `op://` references only, never values; resolved by 1Password at run time                            |
| `infra/`                                              | Terraform, if the repo manages infrastructure                                                       |
| Repository Settings > Secrets and variables > Actions | Repository and environment secrets (`secrets.*`) and variables (`vars.*`)                           |
| Repository Settings > Environments                    | `production` and similar, with reviewers, wait timers and branch rules                              |
| Repository Settings > Actions > General               | Allowed actions, SHA pinning, default `GITHUB_TOKEN` permissions, retention                         |
| Repository Settings > Rules (or Branches)             | Required status checks before merge                                                                 |

GitHub reads some workflows from the **default branch** only: `schedule`, the `workflow_dispatch` button, `workflow_run`, `pull_request_target` and `issue_comment`.

## 3. The pipeline

Every check runs once, at the right level. Pull requests carry all testing; `main` only builds and ships what was already tested.

```mermaid
flowchart TB
  dev["Developer pushes a branch<br/>and opens a pull request"]

  subgraph PR["Pull request: CI, every push to the PR branch"]
    direction TB
    filter{"Only docs or Markdown<br/>changed?"}
    skip["changes job says no code changed:<br/>heavy jobs skipped"]
    quality["quality job<br/>lint, format, types,<br/>unit and integration tests"]
    e2e["e2e job<br/>browser tests, 2 workers"]
    infraq{"infra/ changed?"}
    tf["terraform workflow<br/>fmt, validate, tflint, scan"]
    gatejobs["gate jobs<br/>always run, fail if a needed job failed"]
    filter -- yes --> skip
    filter -- no --> quality
    filter -- no --> e2e
    filter -- no --> infraq
    infraq -- yes --> tf
    skip --> gatejobs
    quality --> gatejobs
    e2e --> gatejobs
    tf --> gatejobs
  end

  checks["Required gate checks pass<br/>branch merged with latest main"]
  merge["Merge to main"]

  subgraph CD["Push to main: Deploy, no tests repeated"]
    direction TB
    build["build job<br/>guard: commit is on main<br/>build once, upload artifact"]
    apply["infra job, environment: production<br/>approval, terraform plan,<br/>destroy guard, apply the saved plan"]
    deploy["deploy job, environment: production<br/>approval, ship the same artifact"]
    smoke["smoke test<br/>live site serves this commit"]
    build --> apply --> deploy --> smoke
  end

  subgraph SEC["Credentials, short-lived and least privilege"]
    direction TB
    ghs["GitHub secret OP_SERVICE_ACCOUNT_TOKEN<br/>repository secret = CI tier<br/>environment secret = production tier"]
    op["1Password service account<br/>op:// references"]
    oidc["GitHub OIDC token<br/>id-token: write"]
    cloud["Cloud role<br/>AWS, GCP or Azure"]
    ghs --> op
    oidc --> cloud
  end

  dev --> filter
  gatejobs --> checks
  checks --> merge --> build
  op -. CI-tier app secrets .-> build
  cloud -. apply role .-> apply
  cloud -. deploy role .-> deploy

  classDef gate fill:#fff3cd,stroke:#8a6d3b,color:#000000;
  classDef run fill:#dbeafe,stroke:#1e40af,color:#000000;
  classDef cred fill:#dcfce7,stroke:#166534,color:#000000;
  class filter,infraq,gatejobs,checks gate;
  class skip,quality,e2e,tf,build,apply,deploy,smoke run;
  class ghs,op,oidc,cloud cred;
```

| Piece              | Runs on                                          | Job                                                | Relates to                                            |
| ------------------ | ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| CI workflow        | Every push to a PR branch                        | Proves the change works: quality and browser tests | Its gate job gates the merge; `main` relies on it     |
| Terraform workflow | Every PR (heavy jobs only when `infra/` changed) | Checks infrastructure code without cloud access    | Its gate job gates infra changes; Deploy applies them |
| Required checks    | Merge button                                     | Blocks merging until the gate jobs pass            | Rely on CI running on PRs                             |
| Deploy workflow    | Push to `main`, or a manual run                  | Builds once, applies infra, deploys, smoke-tests   | Trusts PR checks, so it repeats none of them          |
| 1Password          | Inside jobs that need app secrets                | Supplies API keys and passwords at run time        | One token per tier, stored as a GitHub secret         |
| OIDC               | Jobs that touch the cloud                        | Swaps a short GitHub token for a cloud role        | Replaces stored cloud keys                            |

## 4. Set up the repository

Do these once, in order.

1. **Fix flaky tests first.** With tests running once per PR, a flaky test fails PRs and burns retries. See section 9.1.
2. **Default token to read-only.** Settings > Actions > General > Workflow permissions > "Read repository contents and packages permissions". Grant more per job in YAML.
3. **Restrict actions.** Same page: allow GitHub-owned and verified actions, or a list. Turn on "Require actions to be pinned to a full-length commit SHA" once your workflows are pinned (section 5).
4. **Set retention.** Same page: artifact and log retention. Since 2026-10-01 this one setting also covers checks, runs and statuses (default 90 days).
5. **Control fork PRs.** Same page, fork pull request workflows: require approval for first-time contributors, or for all outside collaborators on a public repository. A maintainer then approves each run (see "Approve workflows to run" in section 12).
6. **Add a budget.** Billing > Budgets and alerts: a budget on Actions with alerts at 75%, 90% and 100%, and included-usage alerts at 90% and 100% (section 11).
7. **Turn on secret scanning and push protection.** In the repository's code security settings, so a leaked token is blocked at push and flagged afterwards (rulesets can enforce it, section 10).
8. **Create environments.** Settings > Environments > `production`: deployment branches "Protected branches only" or `main`; required reviewers and "Prevent self-review" where your plan allows (see "Environment features by plan" below). Deselect "Allow administrators to bypass configured protection rules" where it is offered.
9. **Store secrets and variables.** One 1Password service-account token per tier as `OP_SERVICE_ACCOUNT_TOKEN`: the CI token as a repository secret, the production token as a `production` environment secret (section 6.2). Cloud role ARNs and other identifiers as variables (section 7).
10. **Require checks.** Settings > Rules > New branch ruleset for `main`: require the gate job names, not the heavy jobs (section 9.3 explains why). Branch protection and rulesets are unavailable on free private personal repos. Classic branch protection does not apply to admins unless "Do not allow bypassing the above settings" is on. A ruleset can be bypassed only by actors on its bypass list: keep that list empty. If an actor must be on it, set them to "For pull requests only": they must open a PR, which leaves a trail in the PR and the audit log, but they can still bypass branch protections and merge it.
11. **Protect workflow files.** Add `.github/workflows/ @owner` to CODEOWNERS. Code-owner review is an optional setting of the ruleset rule "Require a pull request before merging". Only when it is on must a PR that changes code-owned content be approved by a code owner; with several owners, approval from any one satisfies it.
12. **Add Dependabot** for actions (section 5.4).

**Environment features by plan:**

| Plan and repository       | Environments, environment secrets, deployment branch rules | Required reviewers, wait timers, custom protection rules | Admin bypass option |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| Free, private             | None: no environments, so no environment secrets or rules  | None                                                     | None                |
| Pro or Team, private      | Yes                                                        | No                                                       | No                  |
| Enterprise, private       | Yes                                                        | Yes                                                      | Yes                 |
| Free, Pro or Team, public | Yes                                                        | Yes                                                      | Yes                 |

The docs say the admin-bypass setting is available only for public repositories on Free, Pro and Team. A repository converted from public to private on Free silently ignores its existing protection rules and environment secrets. On a Free private repository, store the token as a repository secret or upgrade the plan.

**Environment limits and approval flow:**

| Item                            | Value                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required reviewers              | Up to 6 users or teams, each with at least read access; one approval is enough                                                                                   |
| Approve or reject               | Open the run, click "Review deployments", select the environments, add an optional comment, then "Approve and deploy" or "Reject" (Reject fails the workflow)    |
| Waiting job                     | Status "Waiting"; fails automatically if not approved within 30 days                                                                                             |
| Whole run                       | Cancelled at 35 days, including waiting and approval time                                                                                                        |
| Wait timer                      | Whole minutes from 1 to 43,200 (30 days); does not count toward billable time                                                                                    |
| Protection rules                | At most 6 enabled on one environment                                                                                                                             |
| Environment secrets             | A job cannot read them until reviewers approve and every other rule passes                                                                                       |
| Admin bypass (default: on)      | On a pending run, an admin clicks "Start all waiting jobs", picks the environments, adds a comment and confirms "I understand the consequences, start deploying" |
| Environment that does not exist | A workflow that names one creates it, with no protection rules or secrets (section 10)                                                                           |

## 5. The workflows

The examples use version tags such as `@v7` so they read easily. They are the current majors as of 2026-10-14 (list in section 13). In a real repository, pin every action to its full commit SHA, with the version in a comment, and let Dependabot update both:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Get a SHA with `gh api repos/actions/checkout/commits/v7.0.1 -q .sha`. Pin before you turn on the "require SHA pinning" policy (section 4), or tag references are blocked. Why pinning matters: sections 5.4 and 10.

The CI and Deploy examples are for a Node project with pnpm; swap the install, lint and test commands for your stack.

### 5.1 CI: `.github/workflows/ci.yml`

CI runs on every pull request. A `changes` job decides whether code changed, the heavy jobs skip when only docs changed, and one `gate` job is the only required check. The gate always runs, so a docs-only PR is never stuck waiting for a skipped check.

```yaml
name: CI

on:
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    name: Detect changes
    runs-on: ubuntu-slim
    timeout-minutes: 5
    permissions:
      contents: read
      pull-requests: read
    outputs:
      code: ${{ steps.filter.outputs.code }}
    steps:
      - uses: dorny/paths-filter@v4
        id: filter
        with:
          predicate-quantifier: some-with-excludes
          filters: |
            code:
              - "**"
              - "!**.md"
              - "!docs/**"

  quality:
    name: Lint, types, unit tests
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  e2e:
    name: End-to-end tests
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm exec playwright test
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7

  gate:
    name: CI gate
    needs: [changes, quality, e2e]
    if: ${{ !cancelled() }}
    runs-on: ubuntu-slim
    timeout-minutes: 5
    steps:
      - name: Fail if a needed job failed or was cancelled
        if: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
        run: exit 1
```

Require only `CI gate` in the ruleset (section 4).

| Setting                               | Why                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pull_request` only                   | Tests run once per PR push; nothing repeats on `main`                                                                 |
| `changes` job + `if:` on heavy jobs   | Docs-only changes skip the heavy jobs. `**.md` matches every folder, including root `README.md` and `AGENTS.md`       |
| `gate` with `if: ${{ !cancelled() }}` | Runs even when needed jobs were skipped (skipped counts as success) and fails on any `failure` or `cancelled` result  |
| `permissions: contents: read`         | Least privilege for `GITHUB_TOKEN`; every unlisted scope becomes `none`. The `changes` job adds `pull-requests: read` |
| `concurrency` + `cancel-in-progress`  | A new push cancels the older run on the same PR                                                                       |
| `timeout-minutes`                     | Caps a hung job; the default is 360 minutes                                                                           |
| `persist-credentials: false`          | Keeps the checkout token out of later steps                                                                           |
| `setup-node` `cache: pnpm`            | Caches the package store, keyed on the lockfile                                                                       |
| Separate `quality` and `e2e` jobs     | They run in parallel; a failure shows which kind broke                                                                |
| Upload report only on `failure()`     | No artifact storage on green runs                                                                                     |

**Why a gate job.** A workflow skipped by a trigger-level `paths-ignore` leaves its required checks pending, so the PR cannot merge (section 9.3). A trigger-level `paths-ignore` is fine only when you require no checks from that workflow, as with Deploy below. With required checks, keep the workflow always running, skip jobs with `if:`, and require the gate. Without `if: ${{ !cancelled() }}` the gate is itself skipped when a needed job fails, and a skipped required check reports Success.

Run browser tests on both CPUs of a private-repo runner (2 vCPUs). Playwright's default is half the cores, 1 worker. In `playwright.config.ts`:

```ts
workers: process.env.CI ? 2 : 1,
retries: process.env.CI ? 1 : 0,
reporter: process.env.CI ? [["github"], ["list"]] : "list",
```

Before switching, run the whole suite once with `--workers=2 --retries=0`; tests that share data fail there first. Measured gain: section 9.5.

If CI also runs on pushes to `main`, change the browser-test job's `if:` to `github.event_name == 'pull_request' && needs.changes.outputs.code == 'true'` so it still runs only on pull requests.

### 5.2 Infrastructure checks: `.github/workflows/terraform.yml`

Infrastructure checks get their own workflow and use the same gate pattern as CI: the workflow always runs, the heavy job runs only when infrastructure changed, and `Terraform gate` is the required check.

```yaml
name: Terraform

on:
  pull_request:

permissions:
  contents: read

concurrency:
  group: terraform-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    name: Detect infra changes
    runs-on: ubuntu-slim
    timeout-minutes: 5
    permissions:
      contents: read
      pull-requests: read
    outputs:
      infra: ${{ steps.filter.outputs.infra }}
    steps:
      - uses: dorny/paths-filter@v4
        id: filter
        with:
          filters: |
            infra:
              - "infra/**"
              - ".github/workflows/terraform.yml"

  validate:
    name: Terraform validate
    needs: changes
    if: needs.changes.outputs.infra == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: "~1.16.0"
          terraform_wrapper: false
      - run: terraform fmt -check -recursive -diff
      - run: terraform init -backend=false -input=false
      - run: terraform validate
      - uses: terraform-linters/setup-tflint@v6
        with:
          cache: true
      - run: tflint --init
        env:
          GITHUB_TOKEN: ${{ github.token }}
      - run: tflint -f compact

  gate:
    name: Terraform gate
    needs: [changes, validate]
    if: ${{ !cancelled() }}
    runs-on: ubuntu-slim
    timeout-minutes: 5
    steps:
      - name: Fail if a needed job failed or was cancelled
        if: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
        run: exit 1
```

- List every path the checks read in the `infra` filter.
- `init -backend=false` validates without cloud credentials.
- `terraform_wrapper: false` keeps native exit codes (the wrapper never fails on exit code 2).
- Add an IaC scanner (Trivy or Checkov) pinned by **SHA**: on 2026-03-19, 76 of 77 `trivy-action` tags were force-pushed to credential-stealing code. Tags can move; SHAs cannot.
- **Remote state.** Keep state in a remote backend with locking, never in the repository. For S3, set `use_lockfile = true` in the `backend "s3"` block. Deploy runs `terraform init` against that backend (section 5.3).
- **Plan on PRs (optional).** This workflow validates only. To show a plan on each PR, give a job `id-token: write` and a read-only plan role (section 7), run `terraform init` with the backend, and run `terraform plan -lock=false`.

### 5.3 Deploy: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
    paths-ignore:
      - "**.md"
      - "docs/**"
  workflow_dispatch:
    inputs:
      sha:
        description: Commit to redeploy (must be on main)
        type: string
        required: false

permissions:
  contents: read

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      sha: ${{ steps.target.outputs.sha }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Require commit on main
        id: target
        env:
          INPUT_SHA: ${{ inputs.sha }}
        run: |
          set -euo pipefail
          sha="${INPUT_SHA:-$GITHUB_SHA}"
          [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "::error::invalid sha"; exit 1; }
          git fetch --no-tags origin main
          git merge-base --is-ancestor "$sha" origin/main || { echo "::error::$sha is not on main"; exit 1; }
          git checkout --detach "$sha"
          echo "sha=$sha" >> "$GITHUB_OUTPUT"
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: 1password/install-cli-action@v4
        with:
          version: 2.41.0
      - name: Build
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
          APP_ENV: ci
        run: op run --env-file=.env -- env -u OP_SERVICE_ACCOUNT_TOKEN pnpm build
      - uses: actions/upload-artifact@v7
        with:
          name: site-${{ steps.target.outputs.sha }}
          path: out
          if-no-files-found: error
          retention-days: 14

  infra:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 120
    environment: production
    permissions:
      contents: read
      id-token: write
    env:
      TF_IN_AUTOMATION: "1"
      TF_INPUT: "0"
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ needs.build.outputs.sha }}
          persist-credentials: false
      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: "~1.16.0"
          terraform_wrapper: false
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.TF_APPLY_ROLE_ARN }}
          aws-region: us-east-1
      - run: terraform init -lock-timeout=10m
      - run: terraform plan -lock-timeout=10m -out=tfplan
      - name: Plan summary
        run: terraform show -no-color tfplan | head -c 900000 >> "$GITHUB_STEP_SUMMARY"
      - name: Destroy guard
        run: |
          terraform show -json tfplan | jq -r '.resource_changes[]
            | select(.change.actions | index("delete")) | .address' > deletes.txt
          if [ -s deletes.txt ]; then
            echo "::error::plan deletes resources:"; cat deletes.txt; exit 1
          fi
      - run: terraform apply -lock-timeout=10m tfplan

  deploy:
    needs: [build, infra]
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: production
      url: https://example.com
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: site-${{ needs.build.outputs.sha }}
          path: out
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: us-east-1
      - name: Upload
        env:
          BUCKET: ${{ vars.SITE_BUCKET }}
        run: aws s3 sync out/ "s3://$BUCKET/" --delete
      - name: Smoke test
        run: curl --fail --silent --show-error --retry 6 --retry-all-errors https://example.com/ -o /dev/null
```

| Pattern                                           | Why                                                                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No test jobs                                      | Tests already passed on the PR. Before deleting a test step from Deploy, confirm the PR runs the same tests: a test gated on a build-time variable is skipped on PRs if only Deploy sets it                                   |
| `paths-ignore` on `push`                          | Safe here: no ruleset requires a Deploy check, so skipping docs-only pushes cannot block a merge (contrast with CI, section 5.1)                                                                                              |
| "Require commit on main" guard                    | Refuses to deploy a commit that is not on `main`, which matters for manual redeploys                                                                                                                                          |
| `workflow_dispatch` with `sha`                    | Manual redeploy or rollback to a known commit; the input goes through `env:`, never straight into `run:`                                                                                                                      |
| Build once, upload, download                      | The deployed files are exactly the ones built, not a rebuild                                                                                                                                                                  |
| `concurrency` without cancel                      | Two deploys never overlap and a running deploy is never killed (rules: section 8.2)                                                                                                                                           |
| Saved plan + destroy guard                        | Applies exactly what was reviewed; fails if anything would be deleted. The plan is not a duplicate check: it is the infrastructure change itself, and it supplies the outputs deploy needs                                    |
| `environment: production` on `infra` and `deploy` | Reviewer approval, branch rules and environment secrets apply before the apply and before the upload. Each job that names the environment waits for its own approval, so a run needs two. Spell the name exactly (section 10) |
| No `environment` on `build`                       | The build runs before any approval, so it reads only the repository-level CI-tier token with `APP_ENV: ci`. Production secrets are used only in jobs under `environment: production` (section 6.2)                            |
| Re-running a Deploy run                           | Ships the old commit again (section 10). To ship the latest commit, start a new run                                                                                                                                           |
| Smoke test                                        | Proves the live site serves after deploy                                                                                                                                                                                      |

**Build provenance.** To prove an artifact came from this workflow, add `actions/attest@v4` after the build, with `id-token: write`, `attestations: write` and `contents: read` on that job, and `subject-path` set to the built files (for a container image use `subject-name`, `subject-digest` and `push-to-registry: true`). Verify with `gh attestation verify PATH -R OWNER/REPO`.

**Containers.** To ship an image, log in with `docker/login-action`, build and push with `docker/build-push-action`, and cache layers with `cache-from: type=gha` and `cache-to: type=gha,mode=max`. The job needs `packages: write` to push to `ghcr.io`. The GitHub cache scope rules in section 9.4 apply to layer caches too.

### 5.4 Dependabot: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directories: ["/", "/.github/actions/*"]
    schedule:
      interval: weekly
    cooldown:
      default-days: 7
    groups:
      actions:
        patterns: ["*"]
```

`groups` turns many update PRs into one (fewer CI runs). `cooldown` waits for new releases to settle before proposing them, which also gives time for a compromised release to be caught. Dependabot-triggered runs get a read-only token and no secrets; add any they need with `gh secret set -a dependabot`.

SHA-pinned actions and alerts:

- Dependabot **alerts** are created only for vulnerable actions referenced by semantic version, not for actions pinned to a SHA. Do not rely on alerts or security updates for SHA pins.
- SHA pins still get Dependabot **version-update PRs**. A `# <tag>` comment on the same line as the SHA is kept up to date by those PRs; it does not bring alerts back.
- If the pinned commit has no tag, Dependabot moves it to the latest commit, which may differ from the latest release.
- Use the full commit SHA, never an abbreviation, and check that it comes from the action's own repository, not a fork.
- To screen new or updated actions, run dependency review (`actions/dependency-review-action`) on PRs that change workflows. Its coverage of SHA-pinned actions is not documented, so do not rely on it for them. The stronger alternative is a workflow dependency lockfile (section 10).

## 6. Secrets, variables and 1Password

### 6.1 GitHub's own stores

| Store                     | Read as                                     | Masked | Use for                                                                |
| ------------------------- | ------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Repository secret         | `secrets.NAME`                              | Yes    | A token every workflow needs, such as the 1Password token              |
| Environment secret        | `secrets.NAME` in a job with `environment:` | Yes    | Production-only credentials; released only after protection rules pass |
| Organization secret       | `secrets.NAME`                              | Yes    | Shared across selected repos                                           |
| Variable (repo, env, org) | `vars.NAME`                                 | No     | Non-secret config: role ARNs, bucket names, regions                    |

- Precedence: environment over repository over organization.
- Limits: 48 KB per secret; 100 repository and 100 environment secrets; 1,000 organization secrets.
- Anyone with write access can read repository secrets by editing a workflow. Keep production credentials in environment secrets behind reviewers.
- Fork PRs and Dependabot runs get no secrets.
- Masking is exact-match and best effort. Register derived values with `echo "::add-mask::$VALUE"` before printing anything. Never store JSON blobs as one secret.
- A job output that contains a masked value is dropped (`Skip output 'X' since it may contain secret.`). Load secrets in each job that needs them.

**Masking is not a security boundary.** GitHub redacts secrets printed to logs, but "there are multiple ways a secret value can be transformed, automatic redaction is not guaranteed". Obfuscated output such as `echo ${SOME_SECRET:0:4}; echo ${SOME_SECRET:4:200};` gets around it. How secrets leak on the runner:

| Where the secret sits                                  | Risk                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment variable                                   | Readable with `printenv`; other processes run by the same user can read it (this includes variables set by `op run`)                                                   |
| `${{ secrets.X }}` written directly inside `run:`      | Ends up in a generated shell script stored on disk, where it is accessible. Pass it through `env:` instead                                                             |
| Command-line argument                                  | Other processes see it with `ps`. Prefer environment variables, STDIN or whatever mechanism the target application supports                                            |
| Self-hosted runner, command-line secret of another job | Visible with `ps x -w`; a runner is not guaranteed to run only one job. Use ephemeral just-in-time runners to reduce this                                              |
| `GITHUB_TOKEN`                                         | An action can read it through the `github.token` context even if the workflow never passes it. Default to read-only `contents`, and raise it per job only where needed |

**Credentials beyond `GITHUB_TOKEN`.** `GITHUB_TOKEN` is scoped to the single repository that ran the workflow. When a job needs more, use this order:

1. `GITHUB_TOKEN`.
2. A repository **deploy key**: Git clone and push only, not the REST or GraphQL API.
3. A **GitHub App installation token**, generated in the workflow, with granular permissions.
4. Only if unavoidable, a fine-grained PAT from a new account that belongs to your organization, granted only the needed repositories. GitHub calls this approach not scalable and says to prefer alternatives such as deploy keys. Keeping that PAT in 1Password is this guide's advice, not GitHub's.

Never use a classic PAT or a personal account's SSH key: they indirectly give broad access to every user with write access to the repository. A PAT from your own account breaks when you leave the organization. GitHub's Node.js publish tutorial says publishing a package to a different repository "must" use a classic PAT; that conflicts with GitHub's security page, so follow the security page.

### 6.2 1Password service accounts

A service account is a non-human 1Password identity with its own token, scoped to specific vaults.

1. **Create a vault per environment**, such as `app-ci` (test credentials) and `app-prod`. Service accounts cannot read Personal, Private or Employee vaults or the default Shared vault.
2. **Create one service account per tier** in the UI (Developer > Service accounts) or with the CLI (step 3). Permissions: `read_items`, `write_items`, `share_items`. CI needs `read_items` only. Vault access cannot be changed after creation: create a new account instead. The token (prefix `ops_`) is shown once.
3. **Store each token in GitHub** without it touching your terminal or disk. Pipe the CLI output straight into `gh secret set`:

   ```bash
   op service-account create "app-ci" --vault "app-ci:read_items" --expires-in 90d --raw \
     | gh secret set OP_SERVICE_ACCOUNT_TOKEN
   op service-account create "app-prod" --vault "app-prod:read_items" --expires-in 90d --raw \
     | gh secret set OP_SERVICE_ACCOUNT_TOKEN --env production
   ```

   Use one token per tier. The CI token is a repository secret and reaches jobs without an environment (CI, and the Deploy build). The production token is an environment secret on `production` and reaches only jobs that name that environment, after approval. On a GitHub Free private repository there are no environments (section 4): store the token as a repository secret, or upgrade the plan.

4. **Rotate** in the UI (service account > Token > Rotate Token), then update the GitHub secret. The CLI cannot rotate. Rotation leaves the old token valid until the expiry you pick, so for a planned rotation choose a window long enough to update every GitHub secret that holds the token.
5. **Revoke a compromised token**: service account > Token > Revoke Token, which removes its vault access at once. Or rotate with "Expire existing token" set to now. Rotating with a delayed expiry is not enough after a leak. Then update the GitHub secret and delete the leaked log (section 10).

**Rate limits** (per token per hour, and per account per day):

| Plan                    | Hourly reads | Hourly writes | Daily reads + writes |
| ----------------------- | ------------ | ------------- | -------------------- |
| Business                | 10,000       | 1,000         | 50,000               |
| Teams                   | 1,000        | 100           | 5,000                |
| Individual and Families | 1,000        | 100           | 1,000                |

`op read` by name costs 3 reads per reference (1 with vault and item IDs). Check usage with `op service-account ratelimit`. A 1Password Connect server (self-hosted, section 6.6) has no rate limits when you outgrow them.

Other request costs (pass vault and item IDs to cut them):

| Command                          | Cost                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `op item get`                    | 3 reads (1 with item and vault IDs)                                           |
| `op item list`                   | 1 + 1 per vault the account can reach (3 with `--vault`, 2 with the vault ID) |
| `op item create`                 | 1 read and 1 write (1 request with the vault ID)                              |
| `op item edit`, `op item delete` | 5 reads and 1 write (one read fewer with the vault ID)                        |

With more than one vault, `op item` and `op document` need `--vault`.

The two `429` errors mean different limits:

| Message says                                                                               | Limit                                                | What to do                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `...this service account is allowed to make. Please retry in 59 minutes...`                | Hourly, per token                                    | Wait for the 60-minute window, change account type, contact support, or create a new service account (each token has its own hourly limit)        |
| `...this 1Password account is allowed to make. Please retry in 23 hours and 59 minutes...` | Daily, shared by all service accounts in the account | Wait for the 24-hour window, change account type, contact support, or use Connect. A new service account does not help: it shares the daily limit |

**Environments.** To read a 1Password Environment, grant the service account access to it in the 1Password.com service account wizard. Service accounts get read access to Environments only. Environment access and vault permissions cannot be changed after creation: create a new service account to change them (step 2 above).

### 6.3 Secret references and one `.env` for local and CI

A reference names where a secret lives, never its value:

```text
op://<vault>/<item>/[<section>/]<field>
```

Commit one `.env` of references and use it everywhere:

```dotenv
DATABASE_URL="op://app-$APP_ENV/postgres/url"
STRIPE_SECRET="op://app-$APP_ENV/stripe/Keys/secret key"
```

- Locally: `APP_ENV=dev op run --env-file=.env -- pnpm dev` (signs in with your desktop app).
- In CI: the same command with `OP_SERVICE_ACCOUNT_TOKEN` set and `APP_ENV` matching the token's tier: `ci` with the repository (CI) token, `prod` with the production environment token. A mismatch fails, because each token reads only its own vault.
- Get exact references with `op item get <item> --format json` and read each field's `reference`.
- Names with spaces work in references; quote them in a shell. Use IDs instead of names for characters outside `a-z A-Z 0-9 - _ .` and spaces.
- A reference leaks vault, item and field names; use IDs if that matters. Never commit `op inject` output.

### 6.4 Option A: `1password/load-secrets-action@v5`

This example uses the CI-tier token (a repository secret) and a CI vault reference:

```yaml
- name: Load secrets
  id: op
  uses: 1password/load-secrets-action@v5
  with:
    version: 2.41.0
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    DATABASE_URL: op://app-ci/postgres/url
- name: Migrate
  env:
    DATABASE_URL: ${{ steps.op.outputs.DATABASE_URL }}
  run: ./scripts/migrate.sh
```

| Input            | Default  | Meaning                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `export-env`     | `false`  | `true` writes secrets into the job environment for all later steps; `false` exposes step outputs only (safer) |
| `unset-previous` | `false`  | Blanks variables set by earlier 1Password steps                                                               |
| `version`        | `latest` | CLI version to install; pin it (a 2026-07-13 update-server outage broke `latest`)                             |

- Any `env` value that is a whole `op://` reference is resolved; the variable name becomes the output name.
- Every value is masked in logs.
- `OP_ENV_FILE: .env` loads references from a file; `$VAR` inside references is not expanded by the action (use Option B for that).
- Avoid the `configure` sub-action unless every later step needs the token: it exports the token to the whole job.
- v5 also supports **1Password Credential Broker** (public preview; 1Password's name for what some call "Workload Identity", which survives only in the `OP_WORKLOAD_ID` variable): no stored service-account token, 1Password trusts GitHub's OIDC token. It needs `permissions: id-token: write`, `OP_WORKLOAD_ID` and `OP_ENVIRONMENT_ID` variables and an `OP_INTEGRATION_KEY` secret, and loads a whole 1Password Environment. Business accounts only.

Credential Broker setup:

1. An Owner or Administrator turns the Environments policy on: 1Password.com admin console > Policies > Sharing and permissions > Developer permissions > Environments.
2. An administrator adds the integration: 1Password.com > Developer > Agents & workflows > Set up integrations > GitHub Actions. Enter a name and the GitHub organization, then save the integration key in 1Password and add it as an organization secret named `OP_INTEGRATION_KEY`.
3. A team member creates the Environment in the desktop app, selects Connect in its GitHub Actions section, picks the integration, enters the repository, and can limit access to one workflow, environment or branch.
4. Copy the snippet the app shows into the job. Reference variables as `${{ env.NAME }}` with `export-env: "true"`, or as `${{ steps.<id>.outputs.NAME }}` when the step has an `id`.

Limits: the GitHub organization must be on GitHub.com (GitHub Enterprise Server and Enterprise Cloud with data residency are not supported). A GitHub Free organization cannot use it for workflows in private repositories. An OIDC error in the log usually means `id-token: write` is missing.

### 6.5 Option B: CLI with `op run`

This step belongs in a job with `environment: production`, so `secrets.OP_SERVICE_ACCOUNT_TOKEN` is the production token. In a job without an environment, set `APP_ENV: ci` (see the Deploy build, section 5.3).

```yaml
- uses: 1password/install-cli-action@v4
  with:
    version: 2.41.0
- name: Deploy
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    APP_ENV: prod
  run: op run --env-file=.env -- env -u OP_SERVICE_ACCOUNT_TOKEN ./scripts/deploy.sh
```

- `op run` resolves references for the child process only, for its lifetime.
- `env -u OP_SERVICE_ACCOUNT_TOKEN` removes the token from the child; without it, `op run` passes the token through.
- `op run` masks secrets in its own output as `<concealed by 1Password>`. It does not register them with GitHub's masker.
- `--no-masking` only when the output is data piped somewhere (masked output would contain the mask text). `op run` never hands values to your shell, so `::add-mask::` cannot cover them: send that output to a file or a consumer, never to the log.
- `op read "op://vault/item/field"` reads one value; `op inject -i tpl -o out -f` fills a template file (delete it after).
- If `OP_CONNECT_HOST` and `OP_CONNECT_TOKEN` are set, they override the service-account token.

**Your own shell expands `$VAR` first.** If the command that calls `op run` mentions `$VAR`, the calling shell expands it before `op run` can substitute the secret reference. When `VAR` is already set in that shell to an `op://` reference (exported, or set by a step `env:`), the command receives the literal `op://` string, not the secret. Run the expansion in a subshell that `op run` starts:

```bash
MY_VAR=op://vault/item/field op run --no-masking -- sh -c 'echo "$MY_VAR"'
op run --env-file=.env -- sh -c 'curl -H "Authorization: Bearer $API_KEY" https://example.com/'
```

Reading the variable inside a script or program that `op run` launches also works, because `op run` resolves the references into the subprocess environment.

**`op run --environment`.** From 1Password CLI 2.41.0, `op run --environment <environmentID> -- <cmd>` loads every variable of a 1Password Environment.

- Authenticate with `OP_SERVICE_ACCOUNT_TOKEN`, using a service account that was granted access to that Environment (section 6.2). It needs read access only.
- It combines with `--env-file` and secret references. Precedence, highest first: Environments, then env files, then shell variables. Among several Environments, or several env files, the last one specified wins. By that rule, an Environment variable overrides a workflow `env:` value of the same name.
- Copy the ID in the desktop app: Developer > View Environments > View environment > Manage environment > Copy environment ID.
- For several contexts (dev, staging, prod), 1Password recommends Environments over `.env` files that use `$APP_ENV` inside secret references.
- Variables are hidden by default and masked in stdout and stderr unless you pass `--no-masking`.

### 6.6 Option C: a 1Password Connect server

A Connect server is a self-hosted service that answers secret reads for your jobs. Use it when service-account rate limits are too low.

1. Create the server and an access token: 1Password.com > Developer > Directory > Infrastructure Secrets Management > Create a Connect server, or `op connect` in the CLI. Save the `1password-credentials.json` file and the token in 1Password.
2. Deploy it where your runners can reach it. With Docker, run the `1password/connect-api` and `1password/connect-sync` containers from a Compose file next to `1password-credentials.json`.
3. Store the token as the GitHub secret `OP_CONNECT_TOKEN` and the server URL as the variable `OP_CONNECT_HOST`.
4. In the job, set both on the step that loads secrets (`OP_CONNECT_HOST` from `vars`, `OP_CONNECT_TOKEN` from `secrets`) and use `load-secrets-action` or `op run` as in Options A and B. If both Connect and service-account variables are set, Connect wins (section 6.5).

GitHub-hosted runners must be able to reach the server's hostname, so a server on a private network needs a self-hosted runner or private networking.

### 6.7 Which option

| Need                                                                | Use                                       |
| ------------------------------------------------------------------- | ----------------------------------------- |
| A few secrets for one step                                          | Option A, step outputs                    |
| A `.env` shared with local development, or `$APP_ENV` in references | Option B, `op run --env-file`             |
| All variables of a 1Password Environment, with a service account    | Option B, `op run --environment <id>`     |
| No stored token at all (Business plan)                              | Option A with Credential Broker (preview) |
| Over the rate limits, or low latency                                | Option C, a Connect server                |
| Cloud credentials (AWS, GCP, Azure)                                 | Neither: use OIDC (section 7)             |

## 7. Cloud access with OIDC

OIDC replaces stored cloud keys. The job asks GitHub for a short-lived signed token; the cloud trusts tokens from your repository and returns temporary credentials.

**AWS setup:**

1. Create the identity provider once per account:

   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com
   ```

2. Create a role whose trust policy names your repository and the branch or environment. This one is for the Deploy workflow's `infra` and `deploy` jobs, which both run under `environment: production`, so it names that environment. The example uses the immutable `sub` format (see below); the IDs are numeric:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:OWNER@OWNER-ID/REPO@REPO-ID:environment:production"
           }
         }
       }
     ]
   }
   ```

3. In the workflow, grant `id-token: write` to that job only and call `aws-actions/configure-aws-credentials@v6` with `role-to-assume` and `aws-region`. Useful inputs: `role-duration-seconds` (default 3600), `allowed-account-ids` (fails on the wrong account), `role-session-name`.

The `sub` claim depends on the job. The first column is the format of repositories created before 2026-07-15; the second is the immutable format:

| Job                                                        | `sub`, legacy format                     | `sub`, immutable format                                   |
| ---------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `infra` and `deploy` in Deploy (`environment: production`) | `repo:OWNER/REPO:environment:production` | `repo:OWNER@OWNER-ID/REPO@REPO-ID:environment:production` |
| Job without an environment, on `main`                      | `repo:OWNER/REPO:ref:refs/heads/main`    | `repo:OWNER@OWNER-ID/REPO@REPO-ID:ref:refs/heads/main`    |
| PR job without an environment (a read-only plan role)      | `repo:OWNER/REPO:pull_request`           | `repo:OWNER@OWNER-ID/REPO@REPO-ID:pull_request`           |

- **Immutable subjects:** the format is `repo:OWNER@OWNER-ID/REPO@REPO-ID:...`, with numeric IDs (`gh api repos/OWNER/REPO -q '.owner.id, .id'` prints them). Repositories created after 2026-07-15 use it, and so do repositories renamed or transferred after that date. Older repositories keep the legacy form unless they opt in. A trust policy that does not match fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`. AWS cannot match custom claims such as `repository_id` or `repository_owner_id` in trust policies, so match the immutable `sub` instead. Or customize the `sub` template with `PUT /repos/{owner}/{repo}/actions/oidc/customization/sub` (for example to include `job_workflow_ref`), and create the matching cloud condition first.
- Always condition on both `aud` and `sub`; without conditions any GitHub repository could assume the role. The cloud trust policy must define at least one condition.
- Use separate roles: a read-only plan role for PR jobs, and a write role for `main` or `production`. Both Deploy jobs share the `production` subject, so each role (`TF_APPLY_ROLE_ARN`, `DEPLOY_ROLE_ARN`) trusts that subject and has its own permission policy. Any job under `production` can assume either role, so CODEOWNERS review of workflow changes (section 4) is what keeps `deploy` away from the apply role. To split them by subject, use a second environment for the apply.
- Role ARNs and Azure IDs are identifiers, not credentials. Store them as variables (`vars.*`).
- GCP: `google-github-actions/auth@v3` with Workload Identity Federation and an attribute condition on the repository owner. Setup: create a Workload Identity Pool and a provider with issuer `https://token.actions.githubusercontent.com`, set the attribute mapping and conditions, then connect the pool to a service account that has `roles/iam.workloadIdentityUser`. Pass `workload_identity_provider` (`projects/PROJECT/locations/global/workloadIdentityPools/POOL/providers/PROVIDER`) and `service_account` to the action.
- Azure: `azure/login@v3` with a federated credential whose subject matches exactly (case-sensitive, no wildcards). Setup: create a Microsoft Entra ID app and service principal, then add the federated credential. Set its `audience` to `api://AzureADTokenExchange` (recommended; it is `azure/login`'s default, other values are allowed). Store `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID` as variables (GitHub's example uses secrets; either works because they are not credentials) and pass them as `client-id`, `tenant-id` and `subscription-id`.
- For both clouds the job needs `permissions: id-token: write`.

## 8. Workflow syntax reference

### 8.1 Triggers and filters

| Key                            | Notes                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pull_request`                 | Default types `opened`, `synchronize`, `reopened`. `branches` matches the **base** branch. Fork PRs get no secrets and a read-only token                                             |
| `push`                         | Use `branches: [main]` to avoid duplicating `pull_request` runs                                                                                                                      |
| `workflow_dispatch`            | Manual button and `gh workflow run`. Up to 25 inputs: `string`, `boolean`, `choice`, `number`, `environment`                                                                         |
| `workflow_call`                | Makes a reusable workflow. Inputs: `string`, `boolean`, `number`                                                                                                                     |
| `schedule`                     | POSIX cron, UTC by default, `timezone:` accepts an IANA zone. Minimum 5 minutes. Default-branch rule: section 2                                                                      |
| `merge_group`                  | Needed alongside `pull_request` if you use a merge queue                                                                                                                             |
| `workflow_run`                 | Runs after another workflow; check `github.event.workflow_run.conclusion`. Privileged: read section 10 before using it                                                               |
| `pull_request_target`          | Runs with secrets on the base branch. Privileged: read section 10 before using it. Still runs on a PR with a merge conflict                                                          |
| `paths` / `paths-ignore`       | Whole-workflow filter. Not both on one event. Quote patterns starting with `*`, `[` or `!`. A skipped workflow leaves its required checks pending: use a gate job (section 5.1, 9.3) |
| `branches` / `branches-ignore` | Not both on one event; use `!` patterns to mix. With `branches` and `paths` both set, the workflow runs only if both match                                                           |

Globs: `*` does not cross `/`; `**` does. `docs/*` is one level, `docs/**` is all of it.

### 8.2 Workflow and job keys

| Key                   | Notes                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissions`         | Workflow or job. Listing any scope sets the rest to `none`. `id-token: write` for OIDC                                                                                                                                                          |
| `concurrency`         | `group`, `cancel-in-progress` (accepts an expression, such as `${{ !contains(github.ref, 'release/') }}`), and `queue: max` (up to 100 pending runs, not with `cancel-in-progress: true`). Rules below                                          |
| `env`, `defaults.run` | Shared variables, shell and working directory                                                                                                                                                                                                   |
| `needs`               | Job order; a failed dependency skips the job unless `if: ${{ !cancelled() }}`                                                                                                                                                                   |
| `if`                  | A job skipped by `if` reports Success and does not block a required check. A gate job needs `if: ${{ !cancelled() }}` itself (section 5.1)                                                                                                      |
| `runs-on`             | `ubuntu-latest`, `ubuntu-24.04`, `ubuntu-24.04-arm`, `ubuntu-26.04`, `ubuntu-26.04-arm`, `ubuntu-slim` (1 vCPU), `windows-latest`, `windows-11-arm`, `macos-latest`, `macos-15-intel`, `macos-26-intel`, or labels for self-hosted. Notes below |
| `timeout-minutes`     | Default 360; set every job                                                                                                                                                                                                                      |
| `strategy.matrix`     | Up to 256 jobs; `fail-fast` (default true), `max-parallel`, `include`, `exclude`                                                                                                                                                                |
| `services`            | Sidecar containers such as Postgres                                                                                                                                                                                                             |
| `environment`         | `name` and `url`; applies protection rules and environment secrets                                                                                                                                                                              |
| `outputs`             | Map job outputs from step outputs                                                                                                                                                                                                               |
| `cache-mode`          | `read`, `write`, `write-only`, `none`; low-trust triggers default to `read`                                                                                                                                                                     |

**Concurrency rules:**

- `concurrency` and `environment` are independent. A workflow that deploys to `production` without a `concurrency` group is not serialized with others.
- To serialize deploys across workflows, put one identical hard-coded group name (such as `deploy-production`) in every workflow that deploys there. Group names are case-insensitive (`prod` equals `Prod`) and shared by all workflows in the repository.
- For groups not meant to be shared, such as per-ref CI groups, prefix with `${{ github.workflow }}` so a run cancels only runs of the same workflow. Do not add that prefix to a shared deploy group: it makes the name differ per workflow and stops cross-workflow serialization.
- Inside a reusable workflow, `github.workflow` is the caller's name. If caller and called workflow both use it in `concurrency.group` with `cancel-in-progress: true`, the called workflow cancels its caller.
- With the default `queue: single`, at most one run is pending per group, and a newly queued run replaces the pending one. `queue: max` allows up to 100 pending runs.

**Hosted runner images:**

- Software preinstalled on GitHub-owned images is updated weekly, and each rollout takes several days. The default Python in `PATH` varies between hosted runners.
- Set language versions explicitly with `setup-node`, `setup-python`, `setup-go`, `setup-java`, `setup-dotnet` or `ruby/setup-ruby` instead of relying on what is preinstalled.
- To see a run's exact tools, open the log: Set up job > Runner Image > Included Software.
- `ubuntu-latest` maps to Ubuntu 24.04 today. `ubuntu-26.04` and `ubuntu-26.04-arm` are listed as labels, so test on them early. The runner docs do not say when `ubuntu-latest` will move (section 13 gives the changelog's window).
- `-latest` means the latest stable image, which may not be the newest OS from the vendor. `macos-latest` is macOS 26 arm64 with 3 M1 CPUs and 7 GB RAM.

### 8.3 Step keys, expressions and commands

- Step keys: `id`, `name`, `if`, `uses`, `with`, `run`, `shell`, `env`, `working-directory`, `continue-on-error`, `timeout-minutes`.
- Contexts: `github`, `env`, `vars`, `secrets`, `inputs`, `steps`, `needs`, `matrix`, `runner`, `job`.
- Status functions: `success()` (default), `failure()`, `cancelled()`, `!cancelled()` (prefer over `always()`; see "Cancellation" below).
- Functions: `contains`, `startsWith`, `endsWith`, `format`, `toJSON`, `fromJSON`, `hashFiles`, `case`.
- Secrets cannot appear in `if:`; copy them to `env:` and test `env.X != ''`.
- Outputs: `echo "name=value" >> "$GITHUB_OUTPUT"`. Environment: `>> "$GITHUB_ENV"`. Summary: `>> "$GITHUB_STEP_SUMMARY"` (1 MiB per step). `::set-output` is deprecated.
- Default shell: on Linux and macOS `run` uses `bash -e`; `shell: bash` adds `-o pipefail`. Two exceptions: in a job with `container:`, `run` defaults to `sh`, so bash-only syntax and `pipefail` are not available unless `shell: bash` is explicit; on Windows runners the default is `pwsh` (PowerShell Core). Override with `defaults.run.shell: bash` (workflow or job level) or a per-step `shell:`.
- Containers: `container.options` does not support `--network` or `--entrypoint`. A private image needs `container.credentials` (for `ghcr.io`, `${{ github.actor }}` and `${{ secrets.GITHUB_TOKEN }}`). Job containers, service containers and Docker container actions need a Linux runner: Ubuntu on GitHub-hosted runners, or a Linux machine with Docker installed when self-hosted.

**`if:` syntax pitfalls:**

- An `if:` that starts with `!` must be wrapped in `${{ }}` (`if: ${{ !cancelled() }}`) or escaped with `''`, `""` or `()`, because `!` is reserved YAML notation. A bare `if: !cancelled()` is not allowed.
- Otherwise the `${{ }}` wrapper is optional, but when used it must enclose the whole expression.
- Inside `${{ }}`, string literals take single quotes only (`'refs/heads/main'`); double quotes throw an error. String comparisons ignore case.
- An `if:` without a status function gets an implicit `success()`. To run after a failure, write `${{ failure() && steps.x.conclusion == 'failure' }}`.
- Shell tests such as `[[ ... ]]` cannot be evaluated in `jobs.<job_id>.if`. Put them inside a step's `run`.

**Cancellation:**

- When a run is cancelled, the server re-evaluates `if` for running jobs and unfinished steps. A job whose condition is true is not cancelled: `if: always()` stays true and the job continues. Use `${{ !cancelled() }}` instead.
- If a standard cancel (UI or API) does not work, a condition such as `always()` is a common cause. Use the REST API force-cancel endpoint, `POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel`.
- For jobs and steps that do get cancelled, the runner sends SIGINT (Ctrl-C) to the step's entry process. If it has not exited within 7500 ms, the runner sends SIGTERM (Ctrl-Break), waits 2500 ms, then kills the process tree. After the 5-minute cancellation timeout, the server forcibly ends any job or step marked for cancellation that still runs. That does not cover jobs kept alive by a true condition such as `always()`.
- Deploy scripts should handle SIGINT and SIGTERM so they can clean up before the kill.

**Background and parallel steps.** Steps can run concurrently inside one job:

```yaml
steps:
  - id: server
    background: true
    run: pnpm start
  - parallel:
      - run: pnpm lint
      - run: pnpm typecheck
  - run: pnpm test:e2e
  - cancel: server
```

- `background: true` starts a step (such as a server) and the job moves on. Give it an `id` if later steps refer to it.
- Later steps use `wait: <id>`, `wait: [a, b]`, `wait-all:` (no arguments) or `cancel: <id>` (one step; SIGTERM, then SIGKILL after a short grace period).
- `parallel:` runs a list of steps concurrently and waits for all of them. It is shorthand for `background: true` on each step plus an implicit `wait`.
- At most 10 background steps run at once per job; extra ones queue.
- A background step's outputs and env changes are available only after a `wait` or `wait-all` that includes it. A failed background step fails the job at the next `wait` or `wait-all` that includes it, unless that step sets `continue-on-error`.
- An implicit `wait-all` runs before post-job cleanup. `wait`, `wait-all` and `cancel` always run and do not support `if`.
- Neither `background` nor `parallel` can be declared inside a composite action, though a composite action can itself run as a background step.
- Use `parallel:` instead of sequential lint and typecheck steps, and `background: true` with `wait` instead of the `cmd &` plus `sleep` pattern.

**`gh` CLI in workflows.** `gh` is preinstalled on GitHub-hosted runners.

```yaml
- name: Label the issue
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GH_REPO: ${{ github.repository }}
    NUMBER: ${{ github.event.issue.number }}
    LABELS: needs-triage
  run: gh issue edit "$NUMBER" --add-label "$LABELS"
```

- For each step that uses `gh`, set `GH_TOKEN` to a token with the required scopes (`${{ secrets.GITHUB_TOKEN }}` or `${{ github.token }}`; a GitHub App token or PAT also works if it has the scopes).
- `GH_REPO` lets commands such as `gh issue edit` run without a checkout.
- The job's `permissions:` must grant what the command needs, here `issues: write`.
- Pass event values through `env:` and quote them in the script.

### 8.4 Reuse

|             | Reusable workflow                                        | Composite action                                  |
| ----------- | -------------------------------------------------------- | ------------------------------------------------- |
| Unit        | Whole jobs                                               | Steps inside a job                                |
| Called with | `jobs.<id>.uses: owner/repo/.github/workflows/x.yml@ref` | `steps[*].uses: ./.github/actions/x`              |
| Secrets     | `secrets: inherit` or explicit                           | Passed as inputs (no `secrets` context)           |
| Nesting     | 10 levels, 50 unique calls                               | Up to 10 composite actions nested in one workflow |
| Best for    | Standard pipelines shared across repos                   | Repeated setup (install, cache)                   |

**Calling a reusable workflow:**

- A job with `uses:` pointing at a reusable workflow can use only `name`, `uses`, `with`, `secrets`, `strategy`, `needs`, `if`, `concurrency`, `permissions` and `cache-mode`. It cannot set `runs-on`, `env`, `steps`, `timeout-minutes` or `environment`; put `environment:` on the job inside the called workflow.
- Secrets: pass them by name or with `secrets: inherit`, which works only within the same organization or across organizations in the same enterprise. If the caller does not pass an environment secret, it resolves to an empty string and the run shows no error. Set `required: true` under `on.workflow_call.secrets` to make the run fail; that checks only that the caller passes the secret, not that it has a value.
- Secrets go only to the directly called workflow: in A > B > C, B must pass them on to C.
- Set `permissions:` on the calling job. Called and nested workflows can keep or reduce `GITHUB_TOKEN` permissions, never raise them.
- Workflow-level `env` in the caller does not reach the called workflow, and `GITHUB_ENV` cannot pass values from a called workflow to the caller's steps. Pass values with `with:` inputs (read through the `inputs` context, not as env vars) and return them through `on.workflow_call.outputs`.
- Passing an input or secret the called workflow does not declare is an error (`secrets: inherit` excepted for secrets).

**Refs, context, billing, sharing:**

- Pin cross-repository reusable workflows to a full commit SHA (`owner/repo/.github/workflows/x.yml@<sha>`). A tag or branch runs whatever it points to now, and when a tag and a branch share a name, the tag wins.
- Reusable workflows must sit directly in `.github/workflows/` and declare `on: workflow_call`.
- A called workflow runs in the caller's context: `actions/checkout` checks out the caller's repository, and `github.*` describes the caller. To check out the workflow's own files, use `job.workflow_repository` and `job.workflow_sha`.
- The caller pays for the minutes and cannot use the called repository's hosted runners.
- To share actions or workflows from a private repository, set its Settings > Actions > General > Access to "Accessible from repositories owned by ...".
- Actions does not follow repository renames: `uses:` references to an old owner or repository name fail and must be updated.

**Composite action rules:**

- Needs `action.yml` or `action.yaml` with `runs.using: composite`.
- Internal steps are logged as one step. Service containers cannot be used.
- Every `run` step needs an explicit `shell:`.
- Read inputs with `${{ inputs.x }}` (there are no `INPUT_*` variables, and `required: true` does not fail the run by itself).
- Map outputs with `value: ${{ steps.<id>.outputs.<name> }}`.
- Pass inputs to scripts through `env:`, not inline in `run:`.

## 9. Speed and waste

| Rule                                                                                                                                                       | Saves                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Run checks once, on the PR; Deploy only builds and ships                                                                                                   | One full CI run per merge                                   |
| Skip heavy jobs on docs-only changes: a `changes` job plus `if:` and one gate when checks are required (section 5.1); a plain `paths-ignore` when none are | Every docs-only change                                      |
| Infra checks in their own workflow, heavy job only when `infra/` changed                                                                                   | A job per PR without infra changes                          |
| `concurrency` with `cancel-in-progress` on PRs                                                                                                             | Runs made stale by a newer push                             |
| Fix flaky tests; poll for real state instead of fixed waits                                                                                                | Retries (a full extra test run each)                        |
| 2 Playwright workers on 2-vCPU runners (section 5.1)                                                                                                       | Browser-test time (one repo's measurement: section 9.5)     |
| Batch fixes and push once; merge latest `main` before the last push                                                                                        | A full CI run per avoided push                              |
| `timeout-minutes` on every job                                                                                                                             | Hung jobs running to 6 hours                                |
| `ubuntu-slim` for small gate or label jobs                                                                                                                 | Cheapest runner ($0.002/min)                                |
| Upload artifacts on failure only, short `retention-days`                                                                                                   | Storage                                                     |
| Package-manager cache via `setup-node` `cache:`; keep the default branch's cache warm (section 9.4)                                                        | Dependency downloads                                        |
| Re-run only failed jobs: `gh run rerun RUN_ID --failed` (or one job with `--job JOB_ID`)                                                                   | The jobs that already passed                                |
| `parallel:` for independent steps in one job (section 8.3)                                                                                                 | Wall-clock time of sequential lint and typecheck steps      |
| Keep the browser-test suite to what protects the business: compliance, forms, accessibility, content renders                                               | Most of the browser-test time                               |
| `groups` in Dependabot                                                                                                                                     | Fewer update PRs, so fewer CI runs                          |
| Check vitest's `pool` and `isolate` settings when the unit-test job is a large share of minutes; read per-test times first                                 | jsdom environment start-up, which can be much of a unit job |

### 9.1 Fix flaky tests by waiting on real state

Each flaky failure is retried, and each retry is a full extra test run. Fix flaky tests before you tune CI.

- Find them: look in recent logs for tests that failed once and passed on retry. Find each cause (a fixed wait, measuring during an animation, tests sharing data) and change the test to wait on real state.
- Never `waitForTimeout(n)` and then assert. Poll for the real condition. For example, wait until a job reports it is done:

  ```ts
  await expect
    .poll(async () => (await page.request.get("/api/jobs/1")).json(), {
      timeout: 5000,
    })
    .toMatchObject({ status: "done" });
  ```

- Measure layout (spacing, positions) with motion off, so entrance animations cannot shift what you measure: `await page.emulateMedia({ reducedMotion: "reduce" });`
- Before trusting a fix, run the test repeatedly with retries off: `pnpm exec playwright test <file> -g "<name>" --repeat-each=5 --retries=0`.

### 9.2 Keep the browser suite small

Keep tests that protect the business and the law; drop tests of looks and motion.

| Keep                                                              | Drop                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Legal and compliance text                                         | Animation, canvas and video behaviour                  |
| Forms submit and report errors                                    | Pixel sizes and layout details                         |
| Accessibility: automated scan, keyboard use, 16px text, 400% zoom | The same check repeated at extra widths or zoom levels |
| Pages readable with reduced motion and with JavaScript off        | Print-view repeats of checks already covered           |
| Each page renders its content                                     | Tests that break on every design change                |

### 9.3 Skipped workflows and required checks

A workflow skipped by `paths`/`paths-ignore`, by `branches`/`branches-ignore`, or by a commit-message skip leaves its required checks **pending**, which blocks merging. Pick one of two fixes:

| Situation                               | Fix                                                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No check from this workflow is required | A plain `paths-ignore` on the trigger is fine (the Deploy workflow, section 5.3)                                                                                        |
| A check from this workflow is required  | Let the workflow always run. Detect changes in a first job, skip the heavy jobs with `if:`, and require one final gate job with `if: ${{ !cancelled() }}` (section 5.1) |

The gate fails when any needed job's result is `failure` or `cancelled`. A job skipped by `if:` reports Success, so a docs-only PR passes without running the heavy jobs. Require only the gate's name in the ruleset. It is one stable check, and it fails on a failed or cancelled needed job, which a skipped dependent job would otherwise hide behind a Success.

Skip instructions:

- In the commit message or the PR's HEAD commit: `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]` or `[actions skip]`. Or end the message with a trailer `skip-checks: true` after two blank lines (commit with `git commit --cleanup=verbatim`).
- They apply only to `push` and `pull_request`, not `pull_request_target`.
- To unblock a skipped PR, push a commit without the skip.

### 9.4 Dependency caching

**Scope rules.** A cache saved by a `pull_request` run belongs to `refs/pull/N/merge`, and only re-runs of that PR restore it. Only the default branch's cache is shared across PRs. A run never restores from child or sibling branches. So PR-only CI never warms the cache by itself: something must run on the default branch.

- In this guide's examples, Deploy (push to `main`, `setup-node` with `cache: pnpm`) writes the `main`-scope cache as a side effect. That is an undocumented dependency, not a certain cold start.
- If Deploy is skipped by `paths-ignore`, or its lockfile key changes, new PRs start cold. Make this deliberate: Deploy, or a small `push` or `schedule` warm-up job on the default branch, is what warms `main`'s cache.

**Eviction.** GitHub removes cache entries not accessed in over 7 days. The total per repository is capped (10 GB by default). Past the cap, GitHub evicts the least recently used entries first, which can make caches thrash. Look at entries in the Actions tab > Caches, or with `gh cache list`, and delete stale ones with `gh cache delete`.

**Built-in caching in setup actions:**

| Action                        | Setting                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `actions/setup-python`        | `cache: 'pip'` (also `pipenv`, `poetry`)                                                                                |
| `actions/setup-java`          | `cache: maven` or `cache: gradle`                                                                                       |
| `ruby/setup-ruby`             | `bundler-cache: true`                                                                                                   |
| `actions/setup-go`            | On by default; hashes `go.sum` in the repository root. Set `cache-dependency-path` for several or nested `go.sum` files |
| `actions/setup-dotnet`        | Optional `cache: true` for NuGet; `cache-dependency-path` can point to `packages.lock.json`                             |
| `gradle/actions/setup-gradle` | "Takes care of caching state between workflow runs"                                                                     |

**Other tools: `actions/cache`.** Example for Rust:

```yaml
- uses: actions/cache@v6
  id: cargo
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
    restore-keys: |
      ${{ runner.os }}-cargo-
- run: cargo fetch
  if: steps.cargo.outputs.cache-hit != 'true'
```

- The contents of an existing cache cannot change; create a new key instead. A key is at most 512 characters (longer fails the action).
- `restore-keys` give sequential partial-match fallbacks.
- `steps.<id>.outputs.cache-hit` is `true` only for an exact `key` match, so it can gate install steps.
- On a miss, a new cache is saved only if the job finishes successfully.
- `hashFiles()` returns an empty string if the pattern matches no files.
- Caching may not help small projects (the .NET docs note that few dependencies may see no gain or a slight slowdown), so measure.

**Do not cache Playwright browsers.** Playwright's docs say restore takes about as long as download, and the system packages are not cacheable. One repo measured install at 29s without a cache and 27s on its first cached run. Use `playwright install --with-deps chromium`, or the `mcr.microsoft.com/playwright` container image.

### 9.5 Example results from one repository

A private repository applied these rules in October 2026. The browser-test job had been about 80% of all Actions minutes (661 of 826 in one week).

| Change                      | Before                               | After                                                                 |
| --------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| Browser suite size          | 358 tests, about 36 min              | 114 tests, about 8 min on 1 worker                                    |
| Browser-test workers in CI  | 1 (test step 407s)                   | 2 (test step 236s, job 5.6 min)                                       |
| Test runs per merged change | 3 (PR, CI on `main`, Deploy quality) | 1 (PR)                                                                |
| Checks in Deploy            | Lint, types, unit tests              | None; deploy took about 3 min in total                                |
| Terraform checks            | Every PR push, about 1 min           | Only PRs that touch infrastructure                                    |
| Docs-only change            | Full CI and deploy                   | 0 min with `paths-ignore`; with a gate, about 2 `ubuntu-slim` minutes |
| Minutes per merged change   | About 23                             | About 10 to 11                                                        |

## 10. Security checklist

- `permissions: contents: read` at the top; grant more per job (section 4 sets the repository default).
- Workflow lockfiles supersede SHA pinning for repositories that adopt them, and are GitHub's strongest protection. `.github/workflows/actions.lock` covers transitive dependencies and records each source repository's `owner_id` and `repo_id`, which are checked at run time. It is in preview and GitHub Support does not cover it. Use SHA pinning as the fallback for repositories that cannot adopt it.
  - Setup: `gh extension install github/gh-actions-lock`, then `gh actions-lock` from the repository root (or `gh actions-lock <file>` for one workflow). Re-run it whenever `uses:` dependencies change. Never edit the lockfile by hand.
  - After onboarding, every action a workflow uses must be in the lockfile, and each locked commit must exist on a branch of its source repository.
  - Dependabot regenerates lockfile entries on action bumps but does not onboard a workflow that has no entries yet.
  - Reusable workflows from other repositories are covered by the lockfile in the repository that defines them.
- Without a lockfile: pin every third-party action to a full commit SHA (how: section 5) and enable the "require SHA pinning" policy (section 4). SHA pins get no Dependabot alerts (section 5.4).
- Dependabot for `github-actions` with a cooldown.
- Never put untrusted input (PR title, branch name, commit message, dispatch inputs) straight into `run:`. Pass it through `env:` and quote the variable.
  - Attacker-controlled context properties usually end in `body`, `default_branch`, `email`, `head_ref`, `label`, `message`, `name`, `page_name`, `ref` or `title`.
  - The rule applies inside composite and custom actions too. For JavaScript actions, prefer `with:` inputs.
  - To print untrusted content, wrap it in `::stop-commands::<random token>`. For multiline values written to `$GITHUB_ENV` or `$GITHUB_OUTPUT`, use a random delimiter. For fully arbitrary values, write them to a file.
- Never check out PR code under `pull_request_target` or `workflow_run`. `actions/checkout@v7` refuses fork checkouts there by default.
  - Flag `allow-unsafe-pr-checkout: true` in review. The checkout protection covers only fork PR refs, not `git fetch`, `gh pr checkout` or downloaded artifacts.
  - Under `pull_request_target`, `GITHUB_TOKEN` has read/write access even for public-fork PRs: set minimal `permissions`.
  - A `workflow_run` workflow gets secrets and a write token even when the triggering run did not. Treat its artifacts as untrusted: download them to `${{ runner.temp }}` with `run-id: ${{ github.event.workflow_run.id }}` and `actions: read`, then validate before use.
  - For a fork PR that needs a privileged step, prefer an unprivileged `pull_request` build followed by a `workflow_run` job that never executes PR code.
- OIDC instead of stored cloud keys; trust policies conditioned on `aud` and `sub`. Name the exact environment in `sub`, so a misspelled environment cannot assume the role.
- Production secrets as environment secrets behind required reviewers and branch rules.
  - A workflow that names an environment that does not exist creates it, with no protection rules or secrets. Anyone who can edit workflows can do this; only repository admins can configure environments. Spell names exactly (`production`, not `prod`) and review workflow changes that touch `environment:`.
  - Admins can bypass environment protection rules by default: turn that off and keep ruleset bypass lists empty (section 4).
- Credentials beyond `GITHUB_TOKEN`: deploy key, then GitHub App installation token, then (only if unavoidable) a fine-grained PAT from an organization-owned account. Never a classic PAT or a personal SSH key (section 6.1).
- Masking is not a boundary: never print a secret, and never pass one on a command line or inline in `run:` (section 6.1). `github.token` is readable by any action, so keep it read-only.
- 1Password tokens: read-only, one vault per tier, separate CI and deploy tokens, expiry and rotation.
- `persist-credentials: false` on checkout.
- CODEOWNERS on `.github/workflows/`, with code-owner review turned on in the ruleset (section 4).
- Self-hosted runners only for private repositories, ephemeral. A runner is not guaranteed to run only one job; one job's command-line secrets are visible to another job on the same runner.
- No secrets in caches; anyone who can open a PR can read base-branch caches.
- Re-runs reuse the original `GITHUB_SHA` and `GITHUB_REF`, so re-running an old Deploy ships the old commit. They run with the privileges of `github.actor` (the original trigger), not `github.triggering_actor` (who clicked re-run). Re-run limits: section 11.
- Scan the workflows themselves:
  - Turn on CodeQL code scanning default setup with GitHub Actions analysis enabled. It flags common vulnerable workflow patterns, including script injection and untrusted-checkout "pwn requests" (`pull_request_target`, `workflow_run`).
  - OpenSSF Scorecard (`ossf/scorecard-action`) checks script injection, token permissions and pinned actions, and reports through code scanning.
  - Lint workflow files on every PR that changes them: `actionlint` finds syntax, expression and shell mistakes, and `zizmor` finds security problems such as injection and excessive permissions. Run them as a job gated on `.github/workflows/**`.
  - Secret scanning and push protection are repository settings (section 4). Rulesets can enforce them (next bullet).
  - Make rulesets enforce it. "Require code scanning results" blocks a PR when a required tool finds an alert at a severity set in the ruleset, when its analysis is still running, or when it is not configured. "Require secret scanning alerts are resolved" (public preview) blocks a PR when a secret scan has not finished for the head commit, or when a commit in the PR introduced an open alert of a selected secret type. It covers provider, custom and generic patterns; AI-detected secrets are not supported.
- After any secret leaks into a log: revoke the secret (rotation with a delayed expiry leaves the old one valid), update the GitHub secret, and delete the log (run menu > "Delete all logs", or `gh api --method DELETE /repos/OWNER/REPO/actions/runs/RUN_ID/logs`). For a 1Password token, see section 6.2.

## 11. Billing

- **Free:** standard GitHub-hosted runners on public repositories, self-hosted runners, Dependabot and Pages builds.
- **Private repositories, included per month:** Free 2,000 minutes, Pro 3,000, Team 3,000, Enterprise Cloud 50,000. Cache is 10 GB per repository.
- **Rates (from 2026-01-01):** Linux 2-core x64 $0.006/min, arm64 $0.005/min, `ubuntu-slim` $0.002/min, Windows $0.010/min, macOS $0.062/min.
- **Rounding:** each job rounds up to the whole minute, so many tiny jobs cost more than one combined job.
- **Re-runs and failed runs** are billed. To save minutes, re-run only failed jobs with `gh run rerun RUN_ID --failed`, or one job with `--job JOB_ID`. Re-runs are allowed up to 30 days after the first run and at most 50 times per run, full and partial together. For a reusable workflow referenced by tag or branch, "Re-run all jobs" uses the ref's current target, while failed-job and single-job re-runs reuse the first attempt's SHA.
- **Private-repo runners** have 2 vCPU and 8 GB on Linux and Windows (public repos get 4 vCPU and 16 GB).
- **Budgets** can alert and can stop usage at the limit (set one in section 4).
- **To find what costs most:** list a period's job durations with `gh api repos/OWNER/REPO/actions/runs/RUN_ID/jobs` and total them per job name.

## 12. Troubleshooting

| Symptom                                                              | Cause and fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR stuck on "Expected — Waiting for status"                          | A required check's workflow was skipped by a `paths`, `branches` or commit-message skip: use the gate-job pattern, or push a commit without the skip (section 9.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity`            | Trust policy `sub` does not match: check environment vs branch form and the immutable-subject format                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Authentication error with environment variables` (1Password action) | Token empty: fork PR, Dependabot run, missing `environment:`, or a misspelled secret name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `(429) Too Many Requests` from 1Password                             | Rate limit: use item IDs, load once per job, or move to Connect. Which limit you hit depends on the message wording (hourly per token, or daily per account): section 6.2                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `more than one field matched the secret reference`                   | Duplicate field labels: add the section or use the field ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `item ... has been deleted or archived`                              | Restore the item or point the reference at a live one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Skip output 'X' since it may contain secret.`                       | A masked value in a job output: load the secret in each job                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Plan step fails with exit code 2                                     | `-detailed-exitcode` returns 2 for changes: capture the code, or omit the flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Saved plan is stale`                                                | State changed between plan and apply: re-plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Workflow never starts                                                | File over 500 KB; a YAML error (an invalid file in `.github/workflows` makes GitHub generate a failed run for every new commit: commit only valid workflow files); a merge conflict on the PR (`pull_request` workflows wait until it is resolved; `pull_request_target` still runs); the workflow was disabled manually (re-enable in the Actions tab or with `gh workflow enable`); a skip annotation in the commit message (skips `push` and `pull_request`); or an event created by `GITHUB_TOKEN` (those start no runs, except `workflow_dispatch` and `repository_dispatch`, and the `pull_request` case in the next row) |
| Bot PR's checks never run, or show "Approve workflows to run"        | A PR created or updated by `GITHUB_TOKEN` creates `pull_request` (`opened`, `synchronize`, `reopened`) runs in an approval-required state until a user with write access clicks "Approve workflows to run". Other types and other `GITHUB_TOKEN` events start no runs. For bot PR CI with no approval, create the PR with a GitHub App installation token or a PAT                                                                                                                                                                                                                                                              |
| Deploy job sits at "Waiting"                                         | It awaits environment reviewers: open the run, "Review deployments" (section 4). Deploy has two jobs under `production`, so it waits twice. It fails on its own after 30 days, and the whole run is cancelled at 35 days                                                                                                                                                                                                                                                                                                                                                                                                        |
| Cancel does nothing; run keeps going                                 | A job or step with `if: always()` stays true after cancel. Use `${{ !cancelled() }}`, or force-cancel with `POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel` (section 8.3)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Same test fails on some runs and passes on others                    | A flaky test: fix it before tuning CI (section 9.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 13. New and deprecated, 2025 to 2026

**Use these:**

- `ubuntu-slim` runner (1 vCPU, cheapest).
- `cache-mode` (2026-09-10): cache read or write control per workflow or job.
- Workflow lockfiles (preview, 2026-10-14).
- SHA-pinning enforcement and action block lists (2025-08-15).
- `concurrency.queue: max`, schedule `timezone`, `case()`, YAML anchors, `$/` self-repository references.
- Workflow execution protections (GA 2026-09-17): an allowlist of which actors and events may run workflows. Set it in Settings > Actions > Policies (repository or organization).
- 1Password `load-secrets-action` v5 with Credential Broker (preview).
- `op run --environment` (1Password CLI 2.41.0 or later) to load a whole 1Password Environment.
- Immutable OIDC subjects (repositories from 2026-07-15).

**Act on these:**

- `ubuntu-latest` moves from 24.04 to 26.04 between 2026-10-19 and 2026-11-19 (per the changelog; the runner docs give no date); pin `ubuntu-24.04` if a tool breaks. Hosted images update weekly, so set tool versions with `setup-*` actions (section 8.2).
- `macos-14` retires 2026-11-02.
- The default policy that blocks `pull_request_target` in public repositories is enforced from 2026-11-02 for repositories that used the default. Private and internal repositories are not affected. Before then, check policy insights: move such workflows to `pull_request`, or add an Actions event policy that allows `pull_request_target` (Settings > Actions > Policies).
- Node 20 is gone from runners (2026-09-23): actions must use `node24`, which needs runner 2.327.1 or newer.
- `upload-artifact` and `download-artifact` v3 and older fail; use v7 and v8.
- `::set-output` and `::save-state` are deprecated; use `$GITHUB_OUTPUT` and `$GITHUB_STATE`.

**Current majors (2026-10-14).** Every action used in this guide's examples:

| Action                                  | Version | Action                           | Version |
| --------------------------------------- | ------- | -------------------------------- | ------- |
| `actions/checkout`                      | v7.0.1  | `actions/setup-node`             | v7.1.0  |
| `actions/cache`                         | v6.1.0  | `actions/upload-artifact`        | v7.0.2  |
| `actions/download-artifact`             | v8.0.2  | `actions/attest`                 | v4.2.2  |
| `pnpm/action-setup`                     | v6.1.0  | `dorny/paths-filter`             | v4.0.3  |
| `hashicorp/setup-terraform`             | v4.0.1  | `terraform-linters/setup-tflint` | v6.3.2  |
| `aws-actions/configure-aws-credentials` | v6.3.0  | `google-github-actions/auth`     | v3      |
| `azure/login`                           | v3.1.0  | `1password/load-secrets-action`  | v5.0.1  |
| `1password/install-cli-action`          | v4.1.0  | `docker/login-action`            | v4.6.0  |
| `docker/build-push-action`              | v7.4.0  | 1Password CLI                    | 2.41.0  |

## 14. Sources

Researched 2026-10-14.

GitHub Actions:

- Workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Events: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Contexts and expressions: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts and https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Workflow commands: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Reusable workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- Reusing workflow configurations (concept and reference): https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations and https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- Share across private repositories: https://docs.github.com/en/actions/how-tos/reuse-automations/share-across-private-repositories
- Find and customize actions: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/find-and-customize-actions
- Metadata syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- Composite action tutorial: https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action
- Docker service containers: https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- Jobs in a container: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- Migrate from Azure Pipelines: https://docs.github.com/en/actions/tutorials/migrate-to-github-actions/manual-migrations/migrate-from-azure-pipelines
- Understand GitHub Actions: https://docs.github.com/en/actions/get-started/understand-github-actions
- Use variables: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- Use secrets: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Use the GitHub CLI in workflows: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-github-cli
- `GITHUB_TOKEN`: https://docs.github.com/en/actions/concepts/security/github_token and https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- Trigger a workflow: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- Control workflow concurrency: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- Workflow cancellation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation
- Force-cancel a workflow run (REST API): https://docs.github.com/en/rest/actions/workflow-runs#force-cancel-a-workflow-run
- Re-run workflows and jobs: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs
- Troubleshoot workflows: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- Workflow run logs: https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs
- Caching: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- Hosted runners: https://docs.github.com/en/actions/reference/runners/github-hosted-runners and https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- Choose the runner for a job: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- Language and tool tutorials (caching): https://docs.github.com/en/actions/tutorials/build-and-test-code/python, https://docs.github.com/en/actions/tutorials/build-and-test-code/go, https://docs.github.com/en/actions/tutorials/build-and-test-code/net, https://docs.github.com/en/actions/tutorials/build-and-test-code/powershell and https://docs.github.com/en/actions/tutorials/publish-packages/publish-java-packages-with-gradle
- Publish Node.js packages: https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
- Limits: https://docs.github.com/en/actions/reference/limits
- Skipping runs: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
- Deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Manage environments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- Control deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- Review deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- Secrets: https://docs.github.com/en/actions/reference/security/secrets
- Secure use: https://docs.github.com/en/actions/reference/security/secure-use
- Compromised runners: https://docs.github.com/en/actions/concepts/security/compromised-runners
- Script injections: https://docs.github.com/en/actions/concepts/security/script-injections
- Workflow dependency lockfiles: https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles and https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies
- Get support (preview features are not covered): https://docs.github.com/en/actions/how-tos/get-support
- OIDC: https://docs.github.com/en/actions/reference/security/oidc
- OIDC with reusable workflows (custom `sub` template): https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows
- OIDC in Azure: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- OIDC in Google Cloud: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform
- `pull_request_target` and its default policy (enforced 2026-11-02): https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- About Actions policies: https://docs.github.com/en/actions/concepts/about-actions-policies
- Governing execution of workflows (workflow execution protections): https://docs.github.com/en/actions/how-tos/administer/control-workflow-execution
- Approve workflow runs from forks: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks
- Artifact attestations: https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
- Publish Docker images: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- Manage caches: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manage-caches
- Protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Creating rulesets (bypass list): https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
- Available rules for rulesets (code owners, code scanning, secret scanning): https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- Dependabot options: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions and https://docs.github.com/en/actions/concepts/billing-and-usage
- Runner pricing: https://docs.github.com/en/billing/reference/actions-runner-pricing
- Budgets and alerts: https://docs.github.com/en/billing/concepts/budgets-and-alerts

GitHub changelog:

- Ubuntu 26.04 migration: https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration
- macOS 14 retirement: https://github.blog/changelog/2026-10-01-github-actions-macos-14-runner-image-retirement
- Node 20 removal: https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions
- `cache-mode`: https://github.blog/changelog/2026-09-10-control-github-actions-cache-access-with-cache-mode
- Workflow lockfiles: https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview
- Workflow execution protections: https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available
- SHA pinning policy: https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/
- Safer checkout defaults: https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/
- Retention: https://github.blog/changelog/2026-10-01-actions-retention-now-covers-checks-runs-and-statuses
- Immutable OIDC subjects: https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens
- OIDC reference (immutable subject claims): https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims
- Concurrency queues: https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues

1Password:

- GitHub Actions: https://www.1password.dev/ci-cd/github-actions.md
- Service accounts: https://www.1password.dev/service-accounts/get-started.md
- Rate limits: https://www.1password.dev/service-accounts/rate-limits.md
- Managing service accounts: https://www.1password.dev/service-accounts/manage-service-accounts.md
- Secret references: https://www.1password.dev/cli/secret-reference-syntax.md
- `op run`: https://www.1password.dev/cli/reference/commands/run.md
- Environment variables: https://www.1password.dev/cli/secrets-environment-variables.md
- Connect: https://www.1password.dev/secrets-automation.md
- Connect get started: https://www.1password.dev/connect/get-started.md
- Credential Broker (admin setup): https://www.1password.dev/brokered-access.md
- Credential Broker for GitHub Actions: https://www.1password.dev/brokered-access/github-actions.md
- Environments: https://www.1password.dev/environments.md and https://www.1password.dev/environments/read-environment-variables.md
- Service accounts with the CLI (request costs, `--vault`): https://www.1password.dev/service-accounts/use-with-1password-cli.md
- Secret references: https://www.1password.dev/cli/secret-references.md
- load-secrets-action: https://github.com/1Password/load-secrets-action
- install-cli-action: https://github.com/1Password/install-cli-action

Cloud, Terraform, tools:

- configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- AWS OIDC providers: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS condition keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- GCP auth: https://github.com/google-github-actions/auth
- Azure login: https://github.com/Azure/login
- setup-terraform: https://github.com/hashicorp/setup-terraform
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform plan: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform JSON output: https://developer.hashicorp.com/terraform/internals/json-format
- Trivy action incident: https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know
- Playwright CI and caching: https://playwright.dev/docs/ci#caching-browsers
- dorny/paths-filter: https://github.com/dorny/paths-filter
- actions/attest: https://github.com/actions/attest
- actionlint: https://github.com/rhysd/actionlint
- zizmor: https://github.com/zizmorcore/zizmor
- docker/build-push-action: https://github.com/docker/build-push-action
- Mermaid on GitHub: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams
