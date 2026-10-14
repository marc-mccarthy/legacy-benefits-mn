# CI/CD rules to cut GitHub Actions minutes (created 2026-10-14, updated 2026-10-14)

Live copy: https://claude.ai/code/artifact/ec6d81ba-73ce-4936-81b5-82faef27bf0c

Every check runs once, at the right level: lint, types, unit, integration and browser tests on the pull request; Terraform checks only when infra changes; Deploy only builds and ships. Skip runs nothing needs, and stop flaky tests and repeated pushes from burning minutes.

## Before you start: fix flaky tests first

Do this before changing any workflow. With CI on PRs only and 2 browser-test workers, a flaky test has nowhere to hide: it fails the PR, gets retried, and burns minutes on every push.

1. Read the last few CI logs for tests marked flaky (failed once, passed on retry) and for the same test failing on different branches.
2. Find each one's cause before changing it: reproduce it, then check what the test waits on. The usual causes are a fixed `waitForTimeout`, measuring during an animation, or two tests sharing a database row or file.
3. Fix it as section 4 describes, then prove it with `--repeat-each=5 --retries=0`.
4. Run the whole suite once with `--workers=2 --retries=0`. Only when that passes, apply sections 1 to 7.

## 1. Every check runs once, on the pull request

CI re-running on the push to `main` tests the same code a second time, and Deploy then tests it a third. Run CI on PRs only. In `.github/workflows/ci.yml`:

```yaml
on:
  pull_request:
    paths-ignore:
      - "**.md"
      - "docs/**"

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

- No `push` trigger: the code was already checked on its PR, so CI on `main` would only repeat it.
- Safe only if every branch merges the latest `main` before its PR checks run, so the checked code is what lands on `main`.
- `**.md` matches Markdown in every folder, including root `CLAUDE.md`, `README.md` and `AGENTS.md`. A change touching only Markdown or `docs/` runs nothing; anything that also touches code runs everything.
- `concurrency` cancels the older run when you push to the same PR again, so you pay only for the newest push.
- Before dropping the `push` trigger, check that branch protection does not require these checks on `main`. Branch protection is unavailable on free private repos, so there it cannot block anything.

## 2. Browser tests run on pull requests, with a browser cache

They run on every push to a branch with an open PR, and not again after merge. If the repo has no browser-test job, add this under `jobs:` in `ci.yml` and adjust the commands. If CI still runs on pushes to `main`, also add `if: github.event_name == 'pull_request'` to the job.

```yaml
e2e:
  name: End-to-end tests
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "24"
        cache: pnpm
    - run: pnpm install --frozen-lockfile

    - name: Playwright version
      id: playwright
      run: echo "version=$(pnpm exec playwright --version | awk '{print $2}')" >> "$GITHUB_OUTPUT"

    - name: Cache Playwright browsers
      id: playwright-cache
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ steps.playwright.outputs.version }}-chromium

    - if: steps.playwright-cache.outputs.cache-hit != 'true'
      run: pnpm exec playwright install --with-deps chromium

    - if: steps.playwright-cache.outputs.cache-hit == 'true'
      run: pnpm exec playwright install-deps chromium

    - run: pnpm build
    - run: pnpm exec playwright test
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: |
          playwright-report/
          test-results/
        retention-days: 7
```

The cache skips the browser download (about 40s a run, reported in another repo, not yet measured here). On a cache hit, `install-deps` still installs Chromium's system packages, since those live outside the cache.

- Lint, types, unit and integration tests run in a separate quality job on the same PR pushes, and nowhere else.
- Tests that need a database: add a `services:` block (for example `postgres:17-alpine` with a health check) and set `DATABASE_URL` in the job's `env:`.
- Give every job in every workflow a `timeout-minutes` cap about twice its normal run time (for example quality 15, browser tests 20, Terraform validate 10, deploy 20), so a hung job cannot burn the 6-hour default. Infra apply can take longer: give it its own larger cap.
- The `@v4` tags are placeholders; pin each action to an exact commit SHA for security.

In `playwright.config.ts`, use both CPUs on CI and log every test's duration:

```ts
workers: process.env.CI ? 2 : 1,
reporter: process.env.CI ? [["github"], ["list"]] : "list",
```

- Private-repo runners have 2 vCPUs, and Playwright defaults to half the cores, so 1 worker. In one repo, 2 workers cut a local run of 250 tests from 6.1 to 3.3 min with no failures and retries off.
- Before switching, run the full suite once with `--workers=2 --retries=0`. Tests that share state (one database row, one file) fail there first.
- The `list` reporter prints each test's time in the CI log, so you can see what to cut next without running anything locally.

## 3. Deploy only builds and ships

No lint, unit or browser tests in the deploy workflow: they already passed on the PR. Deploy keeps only what it needs to ship safely. Trigger:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - "**.md"
      - "docs/**"
  workflow_dispatch:
```

Keep one guard in the first job: refuse to deploy a commit that is not on `main` (it matters for manual redeploys of a chosen commit):

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ inputs.ref || github.sha }}
    fetch-depth: 0

- name: Require commit on main
  run: |
    set -euo pipefail
    git fetch --no-tags origin main
    if ! git merge-base --is-ancestor HEAD FETCH_HEAD; then
      echo "::error::$(git rev-parse HEAD) is not an ancestor of main; refusing to deploy" >&2
      exit 1
    fi
```

- Before deleting a test step from Deploy, confirm the PR run covers the same tests. A test that only runs when a variable is set at build time (for example a live contact-form test gated on an endpoint variable) is skipped on the PR if only Deploy sets it. Set the variable in the PR build first, then remove the Deploy step.
- Jobs: build, then infra apply (`terraform plan` + guard + `apply`), then deploy. The plan is not a duplicate: it is the infra change itself, and it supplies the outputs deploy needs.
- `workflow_dispatch` keeps a manual deploy button.
- If branch protection marks a CI check as required, a skipped workflow leaves a docs-only PR waiting on it forever. Either leave those checks unrequired, or add a small always-run job that reports success.

## 4. Flaky tests: wait on real state, not timers

Every flaky failure is retried, and each retry costs a full extra test run.

- Never `waitForTimeout(n)` and then assert. Poll for the real condition. For example, wait until a page transition has finished:

```ts
await expect
  .poll(
    () =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) =>
              (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
                "::view-transition",
              ),
            ).length,
      ),
    { timeout: 5000 },
  )
  .toBe(0);
```

- Measure layout (spacing, positions) with motion off, so entrance animations cannot shift what you measure: `await page.emulateMedia({ reducedMotion: "reduce" });`
- Before trusting a fix, run the test repeatedly with retries off: `pnpm exec playwright test <file> -g "<name>" --repeat-each=5 --retries=0`

## 5. Keep the browser suite small

Keep tests that protect the business and the law; drop tests of looks and motion.

| Keep                                                              | Drop                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Legal and compliance text                                         | Animation, canvas and video behaviour                  |
| Forms submit and report errors                                    | Pixel sizes and layout details                         |
| Accessibility: automated scan, keyboard use, 16px text, 400% zoom | The same check repeated at extra widths or zoom levels |
| Pages readable with reduced motion and with JavaScript off        | Print-view repeats of checks already covered           |
| Each page renders its content                                     | Tests that break on every design change                |

## 6. Infra checks run only when infra changes

A path filter applies to a whole workflow, not one job, so move the Terraform checks out of `ci.yml` into their own `.github/workflows/terraform.yml`:

```yaml
name: Terraform

on:
  pull_request:
    paths:
      - "infra/**"
      - "scripts/plan-guard*"
      - ".trivyignore.yaml"
      - ".github/workflows/terraform.yml"

permissions:
  contents: read

concurrency:
  group: terraform-${{ github.ref }}
  cancel-in-progress: true

jobs:
  terraform:
    name: Terraform validate
    runs-on: ubuntu-latest
    steps:
      # fmt -check, validate, tflint, trivy config scan, as before
```

- List every path the checks read: the Terraform folder, any script the job runs, and its ignore files.
- The deploy workflow's `terraform plan` still runs on every merge, so infra is still checked before it ships.

## 7. Push less, and measure before tuning further

Every push to a PR costs a full CI run (about 10 min in one repo, about 11 in another).

- Batch fixes and push once. Run the affected tests locally first, and push only when the branch is ready for review.
- Merge the latest `main` into the branch before the last push, so the PR checks cover what will land.
- Unit-test jobs can spend much of their time creating jsdom environments. Check vitest's `pool` and `isolate` settings when that job is a large share of the minutes; read the per-test times first.

## Results in the repo this came from

The browser-test job was about 80% of all Actions minutes (661 of 826 in one week).

| Change                      | Before                             | After                              |
| --------------------------- | ---------------------------------- | ---------------------------------- |
| Browser suite size          | 358 tests, about 36 min            | 114 tests, about 8 min on 1 worker |
| Browser test workers in CI  | 1                                  | 2 (local run: 6.1 to 3.3 min)      |
| Test runs per merged change | 3 (PR, CI on main, Deploy quality) | 1 (PR)                             |
| Checks in Deploy            | lint, types, unit tests            | none; build and ship only          |
| Terraform checks            | every PR push, about 1 min         | only PRs that touch infra          |
| Docs-only change            | full CI + deploy                   | 0 min                              |
