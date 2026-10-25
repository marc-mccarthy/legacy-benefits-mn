# Develop environment

Created 2026-10-24. Last update 2026-10-24.

## Intent

A persistent `dev` deployment of the site at `dev.legacybenefitsmn.com`, built from the
`develop` branch, so features can be tested on real AWS before they merge to `main` and ship to
production. Feature PRs target `develop`; a push to `develop` deploys dev; merging `develop` into
`main` deploys prod exactly as today.

## Goals

- Push to `develop` runs Terraform plan and apply for dev, builds the site, deploys it. No infra
  change means a no-op apply.
- Dev and prod are the same Terraform code. Only inputs differ.
- Dev has its own database, Lambda, CloudFront, S3 bucket, SES identity and IAM roles. A dev lead
  can never reach prod data or MedicarePro.
- Dev sends real email to an address set in 1Password.
- Dev posts leads through the real relay transport to a receiver we own that speaks the relay
  contract, so the CRM path is tested end to end.
- Dev is behind HTTP basic auth and carries `X-Robots-Tag: noindex`.
- One 1Password service account token, one GitHub secret, as today. Dev values live in a second
  1Password item in the same vault, referenced by a second env file.
- Local runs can target either env.

## Non-goals

- Per-PR preview environments. Too slow on this stack (ACM, CloudFront, Aurora).
- A separate AWS account for dev.
- Moving off Aurora or restructuring the app.
- Branch protection rules on GitHub. Noted for later.

## Anti-goals

- Sharing any runtime resource between dev and prod to save money. The saving is pennies; the
  blast radius is the business.
- A dev-only code path in the app that prod can accidentally enable. The crm-inbox route is gated
  by a Terraform-set env var and prod never sets it.

## Findings that shape the design

- Domain is never hardcoded. It flows from 1Password fields through `app.env` and `TF_VAR_*`.
- Terraform has no env concept. `var.NAME` prefixes every resource name, so a different `NAME`
  with a different state key yields a parallel stack (`infra/main.tf:32-36`).
- Both GitHub OIDC roles trust only `refs/heads/main` (`infra/iam.tf:83-85`). The terraform role
  ARN is hardcoded in `.github/workflows/deploy.yml:194`. The deploy workflow refuses commits that
  are not ancestors of `main` (`.github/workflows/deploy.yml:42-49`).
- The Lambda env hardcodes `CRM_TRANSPORT = "mock"` (`infra/compute.tf:42`) and never receives
  `MEDICAREPRO_WEBHOOK_URL`. In 1Password, `CRM_TRANSPORT` is `mock` and both MedicarePro URL
  fields are empty. No environment sends to a CRM today.
- Nothing calls `/api/jobs/outbox` (`src/api/index.ts:30`). No scheduler exists. Leads stay
  `pending` in `crm_outbox` forever unless someone POSTs with the bearer token by hand.
- The Zapier transport (`src/lib/crm/transports/zapier.ts`) has no config and no plan. Unused.
- A Cloudflare Worker, `workers/crm-relay`, is the real MedicarePro path. It takes
  `POST /lead` with `Authorization: Bearer <RELAY_SECRET>` and body
  `{ lead, idempotencyKey, attempt }` (`workers/crm-relay/src/lead.ts:56-70`), calls the MedicarePro
  API, and answers `{ ok: true, indId, outcome }` or `{ ok: false, retryable, error }` with 400, 422
  or 502. The site's `WebhookTransport` (`src/lib/crm/transports/webhook.ts`) sends a different,
  flattened body with no auth header, so it cannot talk to the relay. Its URL and secret live in the
  owner's personal `Secrets` vault (`workers/crm-relay/deploy.sh:9-10`), which the CI service
  account cannot read; the service account sees only the vault `Legacy Benefits Group`. Whether the
  Worker is deployed could not be checked from this session.
- Cloudflare Workers are dual-stack, so the IPv6-only Lambda egress reaches the relay. The NAT
  concern applies only to a future IPv4-only vendor.
- The Lambda VPC has IPv6 egress only (`infra/main.tf:71-79`), no NAT gateway. Outbound HTTP to an
  IPv4-only host fails. SES works because it uses the dualstack endpoint. Dev's crm-inbox works
  because CloudFront is dual-stack, and the relay works because Cloudflare is dual-stack.
- Live state, verified 2026-10-24: the Route53 zone `legacybenefitsmn.com` exists in account
  150701180133 and the registrar delegates to it. Prod CloudFront serves the apex and `www`. SES has
  production access and the domain identity is verified. The state bucket holds one key,
  `terraform.tfstate`. The only repo secret is `OP_SERVICE_ACCOUNT_TOKEN`. `main` has no branch
  protection. An empty GitHub environment `dev` exists; this design does not use it.
- The repo uses GitHub's default OIDC subject template with a custom prefix. A job that declares
  `environment:` gets a subject ending in `environment:<name>` instead of `ref:refs/heads/<branch>`,
  which would break the branch-based trust policy. So no job declares `environment:`.
- The repo once had `infra/envs/dev` and `infra/envs/prod` and collapsed them into the flat
  `infra/` root (`.gitignore:86-96`).

## Approaches considered

**A. One Terraform root, env picked by inputs (chosen).** Same `infra/`, backend key from
`-backend-config`, second env file, a handful of new variables. Smallest diff. Dev and prod
identical by construction. Trade-off: one Terraform bug reaches both envs from one file,
mitigated by dev applying first.

**B. Directory per env.** `infra/envs/{dev,prod}` thin roots over one module. Explicit, allows
divergence. More files, a module boundary, and the repo already walked away from it. Rejected.

**Dropped early:** Terraform workspaces (opaque, out of favor for long-lived envs); sharing
CloudFront, Lambda or bucket between envs (complexity for pennies); per-PR previews (too slow).

## Design

### Naming

| Thing          | prod                                            | dev                                                 |
| -------------- | ----------------------------------------------- | --------------------------------------------------- |
| Branch         | `main`                                          | `develop`                                           |
| Env id         | `prod`                                          | `dev`                                               |
| Env file       | `app.env`                                       | app.dev.env                                         |
| 1Password item | `Legacy Benefits Group`                         | `Legacy Benefits Group Dev`                         |
| `NAME`         | `legacybenefitsgroup`                           | `legacybenefitsgroup-dev`                           |
| `DOMAIN_NAME`  | `legacybenefitsmn.com`                          | `dev.legacybenefitsmn.com`                          |
| State key      | `terraform.tfstate`                             | `dev/terraform.tfstate`                             |
| IAM roles      | `legacybenefitsgroup-github-{deploy,terraform}` | `legacybenefitsgroup-dev-github-{deploy,terraform}` |

Prod names do not change. No prod resource is renamed, moved or recreated.

### Env files and 1Password

- `app.env` stays as is for prod. A new file app.dev.env sits next to it with the same keys in the
  same order and the same `op://` format, every reference pointing at the item
  `Legacy Benefits Group Dev` in the vault `Legacy Benefits Group`. The `AWS Credentials` item is
  shared. Both files are tracked; they hold references, never values.
- The one new key in both files: `TF_VAR_GITHUB_BRANCH`. See Terraform variables. Removed from
  both: `MEDICAREPRO_WEBHOOK_URL`, `MEDICAREPRO_ZAPIER_HOOK_URL`. Added to both: `CRM_RELAY_URL`,
  `CRM_RELAY_SECRET`. Added to both: `TF_VAR_CRM_TRANSPORT`,
  `TF_VAR_CRM_RELAY_URL`, `TF_VAR_CRM_RELAY_SECRET`, `TF_VAR_ROUTE53_ZONE_NAME`, `TF_VAR_BASIC_AUTH_USER`,
  `TF_VAR_BASIC_AUTH_PASSWORD`, `TF_VAR_CRM_INBOX_ENABLED`.
- The existing app.env tests (`tests/scripts/app-env.test.ts`, `scripts/app-env.test.sh`) run
  against both files and additionally assert the two files have identical key sets.
- `scripts/with-env.sh` reads `APP_ENV`, default `prod`. `prod` selects `app.env`, `dev` selects
  app.dev.env, anything else aborts. Package scripts stay unchanged, so `APP_ENV=dev pnpm dev`
  runs the site locally against dev's 1Password values.
- The 1Password item `Legacy Benefits Group Dev` is created by the owner, by hand, before the
  first dev deploy. The plan lists every field and its dev value where the value is not secret.

### Terraform

New variables, all also present as `TF_VAR_*` keys in both env files:

- `GITHUB_BRANCH`: `main` or `develop`. Replaces the hardcoded `refs/heads/main` in the trust
  policy. Validation: one of the two.
- `ROUTE53_ZONE_NAME`: the hosted zone the site's records go into. Prod sets it equal to
  `DOMAIN_NAME`. Dev sets the apex. When equal to `DOMAIN_NAME` the zone is created as today;
  otherwise it is looked up with a data source and no zone, no nameserver echo and no `www`
  alias are created. ACM SAN, Route53 aliases, cert validation, SES DKIM and extra records all
  use the resolved zone id and the `www` toggle. Default `""` means same as `DOMAIN_NAME`.
- `CRM_TRANSPORT`: `relay` or `mock`. Passed to the Lambda. Replaces the hardcoded `mock`.
- `CRM_RELAY_URL`: default `""`. Base URL of the relay; the transport posts to `<url>/lead`.
  Required when `CRM_TRANSPORT` is `relay`. Prod: the Worker URL. Dev:
  `https://dev.legacybenefitsmn.com/api/crm-inbox`.
- `CRM_RELAY_SECRET`: sensitive, default `""`. Sent as `Authorization: Bearer`. Required when
  `CRM_TRANSPORT` is `relay`. Prod: the Worker's `RELAY_SECRET`, copied by the owner into the
  `Legacy Benefits Group` item. Dev: a random value the crm-inbox route also checks.
- `CRM_INBOX_ENABLED`: bool, default `false`. Passed to the Lambda as `CRM_INBOX_ENABLED=true`
  only when true. Dev sets true. Prod field is empty.
- `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`: sensitive, default `""`. Both set enables basic auth
  and noindex. One set without the other fails validation.

Changed resources:

- Trust policy uses `refs/heads/${var.GITHUB_BRANCH}`.
- The CloudFront rewrite function gains a basic-auth check ahead of the existing logic when both
  auth vars are set, rendered with `templatefile` from a `.js.tftpl` file in `infra/`. The expected
  header value is base64 of `user:password`, computed in Terraform. The function is attached only
  to the page behavior as today, so `/api/*`, `/_next/static/*`, `/media/*` and `/video/*` stay
  open. Pages are what must not leak; assets are useless without them; the API is Turnstile-gated.
- The response headers policy adds `X-Robots-Tag: noindex, nofollow` when auth is enabled.
- A new EventBridge Scheduler schedule, created only when `CRM_TRANSPORT` is `relay`, rate 5
  minutes, invokes the app Lambda URL with
  `POST /api/jobs/outbox` and `Authorization: Bearer <OUTBOX_JOB_TOKEN>`. Both envs. Uses an
  EventBridge universal target or an HTTP invocation via API destination; builder picks the
  simplest that works with the existing `AWS_IAM`-auth function URL. If the function URL auth
  blocks a plain HTTP destination, the schedule invokes the Lambda directly with a synthetic
  request event for that path, which is what Lambda Web Adapter style handlers accept. Builder
  verifies against the actual handler in `scripts/build-api-bundle.mjs`. The schedule is gated
  because `MockTransport` always reports success, so draining under `mock` would mark real prod
  leads `sent` to nowhere and lose the replay.
- `backend.tf` keeps bucket and region. The `key` line stays as the prod default; CI and local
  dev pass `-backend-config="key=dev/terraform.tfstate"` at init. Terraform allows overriding a
  key that is also set in the file.

Outputs gain `route53_zone_id`, which `infra/scripts/preflight-cutover.sh:62` already expects.

### App code

- `src/lib/crm/index.ts`: modes are `relay` and `mock`. A new `RelayTransport` posts the relay
  contract with the bearer secret. The webhook and zapier transports, their tests and env keys are
  deleted. `CrmTransport.send` gains a third parameter, `attempt`, which the outbox passes from
  `row.attempts` so the relay can look up a repeat by external id.
- New API route `/api/crm-inbox`, registered in `src/api/index.ts`, active only when
  `CRM_INBOX_ENABLED=true`; otherwise returns 404 so it is indistinguishable from a missing route.
  `POST /api/crm-inbox/lead` mimics the relay: 401 without `Authorization: Bearer <CRM_RELAY_SECRET>`,
  400 when the body is not `{ lead, idempotencyKey, attempt }` with a valid lead, else it stores the
  lead and key in a new table `crm_inbox` (id, idempotency_key unique, payload jsonb, received_at)
  and answers 200 `{ ok: true, indId: <row id>, outcome: "created" }`. A repeat key answers 200 with
  the existing id and `outcome: "existing"`, no second row. `GET` requires
  `Authorization: Bearer <OUTBOX_JOB_TOKEN>` and returns the last 50 rows newest first.
- One Drizzle migration adds `crm_inbox`. Prod runs the migration too; the table stays empty there.
- Tests: unit tests for the route (disabled returns 404, POST stores, duplicate key is idempotent,
  GET needs token) and for the two-mode transport factory.

### CI

- `.github/workflows/deploy.yml` triggers on push to `main` and `develop`, plus
  `workflow_dispatch` with `ref` and a required `env` choice.
- A first job resolves `env` from the branch (`main` to `prod`, `develop` to `dev`, dispatch input
  otherwise), the env file name, the state key, and reads `NAME` from 1Password to build the
  terraform role ARN `arn:aws:iam::<account>:role/<NAME>-github-terraform`. Account id stays a
  single workflow-level constant.
- "Require commit on main" becomes "Require commit on <branch>" using the resolved branch.
- No job declares `environment:` (see Findings, OIDC subject). The token stays a repo secret.
- Concurrency group includes the env, so dev and prod deploys never block each other but two dev
  deploys still serialize.
- Build and Terraform steps read the resolved env file instead of `app.env`.
- `.github/workflows/ci.yml` and `.github/workflows/terraform.yml` are unchanged except that
  `terraform.yml` also validates on PRs whose base is `develop`, which it already does since it has
  no branch filter.
- Docs: `README.md` deployment section and `docs/app-env-single-env-file.md` gain the dev env.
  Generated docs and diagrams are regenerated where the API route list changes.

### Bootstrap, done once by the owner with the plan's exact commands

1. Create the 1Password item `Legacy Benefits Group Dev` with every field.
2. Create branch `develop` from `main`.
3. Run the first dev `terraform init` and `apply` locally with `APP_ENV=dev`, using the shared
   `AWS Credentials` item. This creates the dev IAM roles that CI needs. Expect the ACM
   validation and CloudFront creation to take several minutes.
4. Push to `develop`. CI takes over from there.
5. Set `TURNSTILE` dev keys to a Turnstile widget whose hostname list includes
   `dev.legacybenefitsmn.com`. The owner creates that widget.
6. Dev `SES_FROM_ADDRESS` is `nbest@dev.legacybenefitsmn.com`. The dev identity is the subdomain;
   replies to that address bounce, which is acceptable for a test site. Dev
   `LEAD_NOTIFICATION_EMAIL` is whatever inbox the owner wants test leads in.

Prod needs one apply after merge because the trust policy document and Lambda env change. The plan
shows the expected prod plan: in-place updates only, no destroy, no replace. The destroy allowlist
stays as is.

### Efficiencies doc

`docs/deployment-efficiencies.md` is written as part of this work. It records findings not
implemented here:

- Outbound IPv4 from the Lambda needs a NAT gateway. The relay is dual-stack, so this bites only a
  future IPv4-only vendor.
- `main` has no branch protection; `develop` should require the CI workflow and `main` should
  require a PR from `develop`.
- Aurora Serverless v2 plus VPC plus a migrate Lambda for four small tables. DynamoDB would remove
  the VPC, subnets, security groups and the migrate function.
- `AWS_REGION` is hardcoded in `deploy.yml` and `backend.tf`.
- `op run --no-masking` in CI.
- The `terraform.yml` PR check runs validate only, never plan, so a PR cannot show its infra diff.
  A read-only plan on PRs needs a plan-only role.

## Constraints

- Prod resources are never renamed, replaced or destroyed by this work. Every prod plan is
  reviewed before apply.
- No secret values in git, in CI logs, or in this doc.
- Project rules: no code comments beyond a one-line why, tests only for changed files, one
  commit per logical task, markdown only under `docs/`.

## Left to the builder

- Exact Drizzle schema types and migration file name.
- How the EventBridge schedule reaches the function URL (see Terraform section).
- Order of CI steps inside the resolve job and how outputs are passed.
- Whether `with-env.sh` and the tests share one allow-list of env ids or duplicate it.

## Calls made after the builder check

- The prod CRM path is the existing `crm-relay` Worker. The site transport is rewritten to its
  contract instead of inventing a second one.

- Outbox schedule exists only when `CRM_TRANSPORT` is `relay`, so prod keeps its pending rows
  until the relay is configured.
- No `environment:` on CI jobs; trust stays branch-based.
- The crm-inbox POST speaks the relay contract, bearer secret included, so one transport serves
  both envs and prod never carries dev-only code.
- Dev SES identity is the subdomain with a bouncing from address.
- Dev leads carry whatever PII a tester types. Pages are behind basic auth, so only testers reach
  the form. Use fake data on dev.

## Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** a push to `develop` deploys a basic-auth-gated copy of the site to
`dev.legacybenefitsmn.com` with its own AWS stack, while `main` keeps deploying prod unchanged.

**Architecture:** one Terraform root parametrised by `TF_VAR_*` values from a per-env 1Password item
and a per-env env file; one deploy workflow that resolves env from the branch; a relay-contract CRM
transport whose dev target is a route inside the dev site itself.

**Tech Stack:** Terraform 1.16 / AWS provider ~> 6.63, GitHub Actions, 1Password CLI, Next.js static
export, Lambda Function URL handler in `src/api/index.ts`, Drizzle + Postgres, Vitest.

**Spec:** the Design section above in this file.

### Global constraints

- Prod resources are never renamed, replaced or destroyed. Every prod plan is read before apply.
- No secret values in git, logs, docs or chat. Env files hold `op://` references only.
- `app.env` and app.dev.env: identical key sets, ASCII sorted, no comments, no blank lines.
- Every `TF_VAR_<X>` has a `variable "X"` and vice versa; the count after this work is 27.
- No code comments except a one-line why. Tests only for changed files. One commit per task,
  conventional message, no attribution lines. Never `cd <dir> &&` in commands.
- Coverage thresholds (vitest.config.ts): `src/api/**` 100% lines, `src/lib/**` 98% lines.
- Lefthook pre-commit runs docs generate, diagram build, prettier, eslint, terraform fmt, typecheck,
  unit tests, tflint. Let it run; do not bypass with `--no-verify`.
- Branch for this work: `feat/develop-env`, from `main`.

### Review focus

Inputs the spec implies that no task tested until the lines below were added; each has its test in
the owning task:

1. A relay reply of 200 with `ok: false` must not be treated as delivered (Task 1).
2. A crm-inbox POST whose bearer token is a prefix or superstring of the secret must get 401
   (Task 2).
3. `CRM_INBOX_ENABLED` set to anything but `true` keeps the route 404 (Task 2).
4. `ROUTE53_ZONE_NAME` equal to `DOMAIN_NAME` must produce zero prod diff (Task 3 plan check).
5. `APP_ENV=staging` must abort `with-env.sh`, never fall back to `app.env` (Task 4).

---

### Task 1: Relay transport replaces webhook and zapier

**Files:**

- Create: `src/lib/crm/transports/relay.ts`, `tests/lib/crm/transports/relay.test.ts`
- Delete: `src/lib/crm/transports/webhook.ts`, `src/lib/crm/transports/zapier.ts`,
  `tests/lib/crm/transports/webhook.test.ts`, `tests/lib/crm/transports/zapier.test.ts`
- Modify: `src/lib/crm/types.ts`, `src/lib/crm/index.ts`, `src/lib/crm/transports/mock.ts`,
  `src/lib/leads/outbox.ts`, `tests/lib/crm/index.test.ts`, `tests/lib/crm/transports/mock.test.ts`,
  `tests/lib/leads/outbox.test.ts`, `app.env` (lines 12-13), `scripts/generate-derived-diagrams.mjs:87-89`,
  `docs/diagrams/D1-system-context.mmd:18-21,59`, `tests/scripts/app-env.test.ts` (build filter test
  unchanged; key list only)

**Interfaces:**

- Produces `CrmTransport.send(lead: CrmLead, idempotencyKey: string, attempt: number)`.
- Produces `RelayTransport` with `constructor(baseUrl: string, secret: string, timeoutMs = 10_000)`,
  `name = "relay"`, POST to `${baseUrl.replace(/\/+$/, "")}/lead`, headers `content-type:
application/json`, `authorization: Bearer ${secret}`, body `{ lead, idempotencyKey, attempt }`.
- Produces env keys `CRM_RELAY_URL`, `CRM_RELAY_SECRET`; `CRM_TRANSPORT` accepts `relay` | `mock`.
- Reply mapping: HTTP 2xx with JSON `ok: true` is `{ ok: true, reference: String(indId) }`; 2xx
  with `ok: false` or unparsable JSON is `{ ok: false, retryable: false, error }`; 408/429/5xx is
  retryable; other 4xx is not; network error or timeout is retryable.

- [ ] **Step 1: Write `tests/lib/crm/transports/relay.test.ts`**

Reuse the fetch-stub pattern of the deleted webhook test. Cases:

```ts
it("posts the relay contract with the bearer secret", ...)  // url ends with /lead, header authorization === `Bearer ${SECRET}`, body deep-equals { lead, idempotencyKey: KEY, attempt: 2 }
it("strips a trailing slash from the base url", ...)
it("returns the indId as reference on ok: true", ...)        // body '{"ok":true,"indId":42,"outcome":"created"}' -> { ok: true, reference: "42" }
it("treats 200 with ok:false as a non-retryable failure", ...) // review focus 1
it("treats invalid JSON on 2xx as a non-retryable failure", ...)
it.each([[500], [502], [408], [429]])("retries on %s", ...)
it.each([[400], [401], [422]])("gives up on %s", ...)
it("retries on a network error", ...)
it("aborts after the timeout", ...)                           // vi.useFakeTimers, timeoutMs 50
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm vitest run tests/lib/crm/transports/relay.test.ts`
Expected: FAIL, cannot resolve `@/lib/crm/transports/relay`.

- [ ] **Step 3: Implement `RelayTransport` in `src/lib/crm/transports/relay.ts`; add `attempt` to `CrmTransport.send` in `types.ts`; make `MockTransport.send` accept and ignore it**

- [ ] **Step 4: Rewrite `src/lib/crm/index.ts`**

`MODES = ["relay", "mock"]`. `relay` reads `env("CRM_RELAY_URL")` and `env("CRM_RELAY_SECRET")`,
throws `CRM_TRANSPORT=relay but CRM_RELAY_URL is not set` / `... CRM_RELAY_SECRET is not set`.
Error text for unknown modes: `Expected one of: relay, mock.`

- [ ] **Step 5: Update `tests/lib/crm/index.test.ts`**

Replace the webhook and zapier describe blocks with one `relay mode` block (builds from URL and
secret, refuses without URL, refuses without secret, blank values are missing), keep mock,
unrecognised, padding, memoisation and `setCrmTransport` blocks with `relay` in place of `webhook`.

- [ ] **Step 6: Pass `row.attempts` to `transport.send` in `src/lib/leads/outbox.ts:46-49`; assert it in `tests/lib/leads/outbox.test.ts` where `send` is spied**

- [ ] **Step 7: Delete webhook and zapier source and tests. In `app.env` replace lines 12-13 with**

```
CRM_RELAY_SECRET="op://Legacy Benefits Group/Legacy Benefits Group/CRM_RELAY_SECRET"
CRM_RELAY_URL="op://Legacy Benefits Group/Legacy Benefits Group/CRM_RELAY_URL"
```

Keep ASCII order (both sort after `BUSINESS_PHONE`, before `CRM_TRANSPORT`). Update
`scripts/generate-derived-diagrams.mjs:87-89` to list `relay.ts` and `mock.ts`. Edit
`docs/diagrams/D1-system-context.mmd:18-21` and `:59` to say the relay is called when
`CRM_TRANSPORT=relay`.

- [ ] **Step 8: Run the changed tests, typecheck, lint, diagrams**

Run: `pnpm vitest run tests/lib/crm tests/lib/leads/outbox.test.ts tests/scripts/app-env.test.ts && pnpm typecheck && pnpm lint && pnpm diagrams:build && pnpm docs:generate`
Expected: all PASS; `pnpm diagrams:build` rewrites `docs/diagrams/D5-module-map.mmd`,
`SOURCES.md`, `diagrams.manifest.json`; `docs:generate` rewrites the README env block.

- [ ] **Step 9: Commit**

```bash
git add src/lib/crm src/lib/leads/outbox.ts tests/lib/crm tests/lib/leads/outbox.test.ts app.env scripts/generate-derived-diagrams.mjs docs/diagrams README.md
git commit -m "feat(crm): relay transport replaces webhook and zapier"
```

---

### Task 2: crm-inbox route and table

**Files:**

- Create: `src/api/crm-inbox.ts`, `tests/api/crm-inbox.test.ts`, `drizzle/0002_crm_inbox.sql`
- Modify: `src/lib/db/schema.ts`, `drizzle.config.ts:9` (add `crm_inbox` to `tablesFilter`),
  `src/api/index.ts` (routes), `tests/api/index.test.ts` (route table assertion if present),
  `scripts/generate-derived-diagrams.mjs:49` (add `api/crm-inbox.ts` as `crmInboxRoute`),
  `tests/lib/db/schema.test.ts` (table list if asserted)

**Interfaces:**

- Consumes the relay contract from Task 1 (body `{ lead, idempotencyKey, attempt }`, bearer).
- Produces `crmInbox` table: `id serial pk`, `idempotency_key text not null unique`,
  `payload jsonb not null`, `received_at timestamptz not null default now()`.
- Produces `export async function POST(req: Request): Promise<Response>` and
  `export async function GET(req: Request): Promise<Response>` in `src/api/crm-inbox.ts`.
- Routes: `"/api/crm-inbox/lead": { POST }`, `"/api/crm-inbox": { GET }`.
- Gate: `env("CRM_INBOX_ENABLED") === "true"`; otherwise both return 404 `{"error":"Not found"}`.
- POST: 401 `{ error: "Unauthorized" }` unless `authorization` is `Bearer <CRM_RELAY_SECRET>`
  compared with `timingSafeEqual` as in `src/api/jobs-outbox.ts:5-10`; 503 when the secret env is
  unset; 400 `{ ok: false, retryable: false, error: "Invalid lead request" }` when the body lacks a
  string `idempotencyKey`, an integer `attempt >= 1`, or a `lead` with non-empty string `name`,
  `email`, `consentVersion`, `consentedAt`; else insert with `onConflictDoNothing` on
  `idempotency_key`, select the row, answer 200 `{ ok: true, indId: row.id, outcome }` where
  `outcome` is `"created"` for a new row and `"existing"` for a repeat.
- GET: same bearer check against `OUTBOX_JOB_TOKEN`; 200 `{ items: InboxRow[] }`, newest first,
  limit 50.

- [ ] **Step 1: Add `crmInbox` to `src/lib/db/schema.ts` after `crmOutbox`; export `InboxRow = typeof crmInbox.$inferSelect`**

- [ ] **Step 2: Generate the migration**

Run: `pnpm drizzle:generate --name crm_inbox`
Expected: `drizzle/0002_crm_inbox.sql` with one `CREATE TABLE "crm_inbox"` and a journal entry.
Open the SQL and confirm it touches only `crm_inbox`.

- [ ] **Step 3: Write `tests/api/crm-inbox.test.ts`**

Mock `@/lib/db` like `tests/api/jobs-outbox.test.ts` mocks the outbox. Cases:

```ts
describe("when CRM_INBOX_ENABLED is not true", () => {
  it.each([[undefined], [""], ["false"], ["TRUE"], ["1"]])("POST answers 404 for %s", ...) // review focus 3
  it("GET answers 404", ...)
})
describe("POST /api/crm-inbox/lead", () => {
  it("answers 503 when CRM_RELAY_SECRET is unset", ...)
  it("answers 401 without a bearer", ...)
  it.each([["Bearer sec"], ["Bearer secret-x"], ["Basic secret"]])("answers 401 for %s", ...) // review focus 2
  it("answers 400 for a body without a lead", ...)
  it("answers 400 when attempt is 0", ...)
  it("stores a new lead and answers created with the row id", ...)
  it("answers existing for a repeated idempotency key and inserts nothing", ...)
})
describe("GET /api/crm-inbox", () => {
  it("answers 401 without the job token", ...)
  it("lists the newest 50 rows", ...)
})
```

- [ ] **Step 4: Run it, expect failure**

Run: `pnpm vitest run tests/api/crm-inbox.test.ts`
Expected: FAIL, cannot resolve `@/api/crm-inbox`.

- [ ] **Step 5: Implement `src/api/crm-inbox.ts`; register both routes in `src/api/index.ts`; add the diagram member**

- [ ] **Step 6: Run the changed tests and the api coverage gate**

Run: `pnpm vitest run tests/api tests/lib/db --coverage --coverage.include='src/api/**'`
Expected: PASS; `src/api/crm-inbox.ts` 100% lines.

- [ ] **Step 7: Integration check against local Postgres**

Run: `pnpm drizzle:migrate && APP_ENV=prod pnpm test:integration`
Expected: migration applies `0002_crm_inbox`; integration suite PASS. (`APP_ENV` is a no-op until
Task 4; included so the command stays valid afterwards.)

- [ ] **Step 8: Commit**

```bash
git add src/api src/lib/db/schema.ts drizzle drizzle.config.ts tests/api tests/lib/db scripts/generate-derived-diagrams.mjs docs/diagrams
git commit -m "feat(api): crm-inbox route mimics the relay for dev"
```

---

### Task 3: Terraform knows its environment

**Files:**

- Create: `infra/rewrite.js.tftpl`, `infra/scheduler.tf`
- Modify: `infra/variables.tf`, `infra/main.tf:32-36`, `infra/dns.tf`, `infra/ses.tf:14-23`,
  `infra/compute.tf:29-48,80-118,136-170,177`, `infra/iam.tf:66-87`, `infra/outputs.tf`, `app.env`
  (8 new `TF_VAR_` lines), `tests/scripts/app-env.test.ts:30,45-60`, `.trivyignore.yaml` if trivy
  flags the scheduler role

**Interfaces:**

- Consumes nothing from the app tasks except that the Lambda now reads `CRM_TRANSPORT`,
  `CRM_RELAY_URL`, `CRM_RELAY_SECRET`, `CRM_INBOX_ENABLED`.
- Produces variables, exact names and types:

| Variable              | type              | default | validation                                                       |
| --------------------- | ----------------- | ------- | ---------------------------------------------------------------- |
| `GITHUB_BRANCH`       | string            | none    | `contains(["main","develop"], var.GITHUB_BRANCH)`                |
| `ROUTE53_ZONE_NAME`   | string            | `""`    | `"" ` or `DOMAIN_NAME` ends with `.<zone>` or equals it          |
| `CRM_TRANSPORT`       | string            | none    | `contains(["relay","mock"], ...)`                                |
| `CRM_RELAY_URL`       | string            | `""`    | `CRM_TRANSPORT != "relay"                                        |     | startswith(var.CRM_RELAY_URL, "https://")` |
| `CRM_RELAY_SECRET`    | string, sensitive | `""`    | `CRM_TRANSPORT != "relay"                                        |     | length(var.CRM_RELAY_SECRET) >= 16`        |
| `CRM_INBOX_ENABLED`   | bool              | `false` | none                                                             |
| `BASIC_AUTH_USER`     | string            | `""`    | both empty or both set (one validation on `BASIC_AUTH_PASSWORD`) |
| `BASIC_AUTH_PASSWORD` | string, sensitive | `""`    | `(USER == "") == (PASSWORD == "")`, and length >= 12 when set    |

- Produces locals in `infra/main.tf`: `zone_name`, `create_zone`, `zone_id`, `with_www`,
  `basic_auth = var.BASIC_AUTH_USER != "" ? base64encode("${var.BASIC_AUTH_USER}:${var.BASIC_AUTH_PASSWORD}") : ""`.
- Produces output `route53_zone_id`.

- [ ] **Step 1: Add the eight variables to `infra/variables.tf` and the eight `TF_VAR_` lines to `app.env`, ASCII sorted, each `op://Legacy Benefits Group/Legacy Benefits Group/<FIELD>`**

Also add the pairs `["CRM_RELAY_SECRET","TF_VAR_CRM_RELAY_SECRET"]`,
`["CRM_RELAY_URL","TF_VAR_CRM_RELAY_URL"]`, `["CRM_TRANSPORT","TF_VAR_CRM_TRANSPORT"]` to the pairs
test and change the expected variable count from 19 to 27.

- [ ] **Step 2: Run the env test, expect PASS**

Run: `pnpm vitest run tests/scripts/app-env.test.ts`

- [ ] **Step 3: Zone resolution in `infra/main.tf` and `infra/dns.tf`**

In `main.tf` locals: `zone_name = var.ROUTE53_ZONE_NAME != "" ? var.ROUTE53_ZONE_NAME : var.DOMAIN_NAME`,
`create_zone = local.use_domain && local.zone_name == var.DOMAIN_NAME`, `with_www = local.create_zone`.
In `dns.tf`: `aws_route53_zone.this` count becomes `local.create_zone ? 1 : 0`;
`terraform_data.name_servers` the same; add
`data "aws_route53_zone" "parent" { count = local.use_domain && !local.create_zone ? 1 : 0; name = local.zone_name }`;
`local.zone_id = local.create_zone ? aws_route53_zone.this[0].zone_id : data.aws_route53_zone.parent[0].zone_id`;
`site_hostnames = local.use_domain ? concat([var.DOMAIN_NAME], local.with_www ? ["www.${var.DOMAIN_NAME}"] : []) : []`;
ACM `subject_alternative_names = local.with_www ? ["www.${var.DOMAIN_NAME}"] : []`; every
`aws_route53_zone.this[0].zone_id` in `dns.tf` and `ses.tf` becomes `local.zone_id`; CloudFront
`aliases = local.site_hostnames`.

- [ ] **Step 4: Lambda env in `infra/compute.tf:29-48`**

Replace `CRM_TRANSPORT = "mock"` with `CRM_TRANSPORT = var.CRM_TRANSPORT`, add
`CRM_RELAY_URL = var.CRM_RELAY_URL`, `CRM_RELAY_SECRET = var.CRM_RELAY_SECRET`, and merge
`var.CRM_INBOX_ENABLED ? { CRM_INBOX_ENABLED = "true" } : {}`.

- [ ] **Step 5: Basic auth and noindex**

Move the function body to `infra/rewrite.js.tftpl`; `code = templatefile("${path.module}/rewrite.js.tftpl", { basic_auth = local.basic_auth })`.
Prepend to `handler`:

```js
%{ if basic_auth != "" ~}
  var auth = event.request.headers.authorization;
  if (!auth || auth.value !== "Basic ${basic_auth}") {
    return { statusCode: 401, statusDescription: "Unauthorized",
      headers: { "www-authenticate": { value: 'Basic realm="dev"' } } };
  }
%{ endif ~}
```

In `aws_cloudfront_response_headers_policy.security.custom_headers_config` add a
`dynamic "items"` over `local.basic_auth != "" ? [1] : []` with header `X-Robots-Tag`, value
`noindex, nofollow`, `override = true`.

- [ ] **Step 6: Trust policy in `infra/iam.tf:84`**

`values = ["${var.GITHUB_SUBJECT_PREFIX}:ref:refs/heads/${var.GITHUB_BRANCH}"]`.

- [ ] **Step 7: Outbox schedule in `infra/scheduler.tf`**

```hcl
resource "aws_iam_role" "scheduler"          # count = var.CRM_TRANSPORT == "relay" ? 1 : 0, trust scheduler.amazonaws.com
resource "aws_iam_role_policy" "scheduler"   # lambda:InvokeFunction on aws_lambda_function.app.arn
resource "aws_scheduler_schedule" "outbox" {
  count                        = var.CRM_TRANSPORT == "relay" ? 1 : 0
  name                         = "${var.NAME}-outbox"
  schedule_expression          = "rate(5 minutes)"
  flexible_time_window { mode = "OFF" }
  target {
    arn      = aws_lambda_function.app.arn
    role_arn = aws_iam_role.scheduler[0].arn
    input = jsonencode({
      rawPath        = "/api/jobs/outbox"
      requestContext = { http = { method = "POST", path = "/api/jobs/outbox" } }
      headers        = { authorization = "Bearer ${random_password.outbox_token.result}", host = var.DOMAIN_NAME }
    })
  }
}
```

The handler in `src/api/index.ts:94-115` reads exactly these fields.

- [ ] **Step 8: Add `output "route53_zone_id" { value = local.use_domain ? local.zone_id : null }`**

- [ ] **Step 9: Static checks**

Run: `terraform fmt -recursive infra && terraform -chdir=infra init -backend=false && terraform -chdir=infra validate && tflint --chdir=infra --init >/dev/null && tflint --chdir=infra && trivy config --severity HIGH,CRITICAL --exit-code 1 --ignorefile .trivyignore.yaml infra`
Expected: validate `Success!`, tflint no issues, trivy exit 0. If trivy flags the scheduler role,
add an entry to `.trivyignore.yaml` with a one-line statement only if the finding is a cost or
scope trade-off, not a real hole.

- [ ] **Step 10: Prod plan must show in-place updates only** (review focus 4)

The owner adds the eight new fields to the 1Password item `Legacy Benefits Group` first:
`GITHUB_BRANCH=main`, `ROUTE53_ZONE_NAME=legacybenefitsmn.com`, `CRM_TRANSPORT=mock`,
`CRM_RELAY_URL` empty, `CRM_RELAY_SECRET` empty, `CRM_INBOX_ENABLED=false`, `BASIC_AUTH_USER`
empty, `BASIC_AUTH_PASSWORD` empty.

Run: `op run --env-file=app.env -- terraform -chdir=infra init -reconfigure && op run --env-file=app.env -- terraform -chdir=infra plan -lock-timeout=10m -out=/tmp/prod.tfplan && terraform -chdir=infra show -json /tmp/prod.tfplan | scripts/plan-guard.sh infra/destroy-allowlist.txt`
Expected: plan lists `aws_lambda_function.app` (environment), `aws_cloudfront_function.rewrite`
(code, whitespace only; if the diff is empty, better), `aws_iam_role.deploy` and
`aws_iam_role.terraform` (assume policy, same effective value, may show no change) as update in
place; zero `destroy`, zero `replace`; plan-guard exits 0. Do not apply here; CI applies on merge.
Delete `/tmp/prod.tfplan`.

- [ ] **Step 11: Commit**

```bash
git add infra app.env tests/scripts/app-env.test.ts .trivyignore.yaml
git commit -m "feat(infra): per-environment inputs, basic auth, outbox schedule"
```

---

### Task 4: Second env file and `APP_ENV`

**Files:**

- Create: app.dev.env (repo root)
- Modify: `scripts/with-env.sh`, `scripts/app-env.test.sh`, `tests/scripts/app-env.test.ts`,
  `scripts/generate-doc-sections.mjs:43-48` (env block still reads `app.env` only; unchanged)

**Interfaces:**

- Produces `APP_ENV` with values `prod` (default) and `dev`, selecting `app.env` or app.dev.env.
  Any other value: `with-env: APP_ENV must be prod or dev` on stderr, exit 1.
- Produces app.dev.env: every line of `app.env` with the item segment
  `/Legacy Benefits Group/Legacy Benefits Group/` replaced by
  `/Legacy Benefits Group/Legacy Benefits Group Dev/`. The three `AWS_` lines keep the prod item,
  since the AWS keys are shared.

- [ ] **Step 1: Extend `tests/scripts/app-env.test.ts`**

Wrap the existing suite in `describe.each([["app.env"], ["app.dev.env"]])` so every current
assertion runs on both files. Add:

```ts
it("app.dev.env has the same keys as app.env in the same order", ...)
it("app.dev.env points every non-AWS key at the Dev item", ...)   // value includes "/Legacy Benefits Group Dev/"
it("app.dev.env keeps the AWS keys on the shared item", ...)
```

- [ ] **Step 2: Run, expect FAIL on the missing file**

Run: `pnpm vitest run tests/scripts/app-env.test.ts`

- [ ] **Step 3: Generate app.dev.env from `app.env`**

Run: `sed -E '/^AWS_/!s#/Legacy Benefits Group/Legacy Benefits Group/#/Legacy Benefits Group/Legacy Benefits Group Dev/#' app.env > app.dev.env`
Then re-run Step 2, expect PASS.

- [ ] **Step 4: `scripts/with-env.sh`**

After the `CI` short-circuit: `case "${APP_ENV:-prod}" in prod) file=app.env ;; dev) file=app.dev.env ;; *) echo "with-env: APP_ENV must be prod or dev" >&2; exit 1 ;; esac` and use `$file`
in the existence check, the error text and the `grep`.

- [ ] **Step 5: Extend `scripts/app-env.test.sh`**

`fresh` copies both files. Add: `APP_ENV=dev` captures the dev file's `AWS_REGION` line (assert the
captured file contains `Legacy Benefits Group Dev`); `APP_ENV=staging` exits 1 (review focus 5);
missing app.dev.env with `APP_ENV=dev` exits 1.

- [ ] **Step 6: Run both**

Run: `bash scripts/app-env.test.sh && pnpm vitest run tests/scripts/app-env.test.ts`
Expected: `ℹ️ app-env.test.sh passed`, vitest PASS.

- [ ] **Step 7: Commit**

```bash
git add app.dev.env scripts/with-env.sh scripts/app-env.test.sh tests/scripts/app-env.test.ts
git commit -m "feat(env): APP_ENV selects app.env or app.dev.env"
```

---

### Task 5: Deploy workflow resolves its environment

**Files:**

- Modify: `.github/workflows/deploy.yml`, `README.md` (Deployment section and the IPv6 section's
  CRM bullet), `docs/app-env-single-env-file.md` (new section "11. The dev environment", update
  sections 2, 5 and the Gaps list)

**Interfaces:**

- Produces job `resolve` with outputs `env`, `branch`, `env_file`, `state_key`, `tf_role_arn`.
- `env` = `inputs.env` if dispatched, else `prod` for `refs/heads/main`, `dev` for
  `refs/heads/develop`. `branch` = `main` | `develop`. `env_file` = `app.env` | `app.dev.env`.
  `state_key` = `terraform.tfstate` | `dev/terraform.tfstate`.
- `tf_role_arn` = `arn:aws:iam::150701180133:role/<NAME>-github-terraform`, where `<NAME>` is
  `op read` of the `TF_VAR_NAME` reference found in `env_file`.

- [ ] **Step 1: Edit `deploy.yml`**

- `on.push.branches: [main, develop]`; `workflow_dispatch.inputs.env` type `choice`, options
  `prod`, `dev`, required.
- `concurrency.group: deploy-${{ inputs.env || (github.ref_name == 'main' && 'prod' || 'dev') }}`.
- New first job `resolve` (ubuntu-latest, `op` installed, `OP_SERVICE_ACCOUNT_TOKEN` on the one
  step that runs `op read`). It fails when `github.ref_name` is neither branch and no input given.
- `build`, `terraform`, `deploy` take `needs: resolve`; every `app.env` becomes
  `${{ needs.resolve.outputs.env_file }}`; "Require commit on main" fetches
  `origin ${{ needs.resolve.outputs.branch }}`; `role-to-assume: ${{ needs.resolve.outputs.tf_role_arn }}`;
  `terraform -chdir=infra init -backend-config="key=${{ needs.resolve.outputs.state_key }}"`.
- Verify-serving step: when `env == dev`, pass `-u "$BASIC_AUTH_USER:$BASIC_AUTH_PASSWORD"` to the
  two page `curl`s, values resolved with `op run` from the env file's `TF_VAR_BASIC_AUTH_*` lines.
  The `deploy` job therefore also checks out the repo and installs `op` with the same
  `1password/install-cli-action` pin as `build`.
  The health and do-not-contact checks stay unauthenticated (API behavior is open).

- [ ] **Step 2: Lint the workflow**

Run: `command -v actionlint >/dev/null && actionlint .github/workflows/deploy.yml || gh workflow view Deploy --yaml >/dev/null`
Expected: no findings, or the `gh` call prints the YAML without a parse error. If `actionlint` is
missing, say so in the task report; do not install it.

- [ ] **Step 3: Docs**

README Deployment: both branches, both env files, `APP_ENV=dev pnpm dev`, local dev Terraform:
`op run --env-file=app.dev.env -- terraform -chdir=infra init -reconfigure -backend-config="key=dev/terraform.tfstate"`.
README IPv6 section: the CRM bullet now says the relay is dual-stack. app-env doc: new section 11
with the naming table from the Design, section 5 for the resolve job, Gaps list minus the
`environment:` item plus a line that the `dev` GitHub environment is unused.

Run: `pnpm docs:check && pnpm format:check`
Expected: `3 markdown files checked, no stale references`; prettier clean.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml README.md docs/app-env-single-env-file.md
git commit -m "ci(deploy): resolve prod or dev from the branch"
```

---

### Task 6: Efficiencies doc

**Files:**

- Create: `docs/deployment-efficiencies.md`

- [ ] **Step 1: Write it**

H1 `# Deployment efficiencies`, then `Created 2026-10-25. Last update 2026-10-25.`, then one
section per item from the Design's "Efficiencies doc" list, each with the file:line evidence
already cited in Findings, what it would change, and why it is deferred. Add: the relay Worker is
deployed by hand from the owner's personal vault (`workers/crm-relay/deploy.sh:9-10`) and is not
in CI; the CloudFront function embeds the basic-auth value in its code, visible in the console.

- [ ] **Step 2: Check and commit**

Run: `pnpm docs:check && pnpm format:check`

```bash
git add docs/deployment-efficiencies.md
git commit -m "docs: deployment efficiencies not implemented with the dev environment"
```

---

### Task 7: Bootstrap and first dev deploy

Owner actions are marked **owner**. Everything else runs from this checkout. Order matters.

- [ ] **Step 1 (owner): 1Password item `Legacy Benefits Group Dev`** in vault
      `Legacy Benefits Group`, one field per key in app.dev.env minus the `AWS_` ones. Values that
      differ from prod: `NAME=legacybenefitsgroup-dev`, `DOMAIN_NAME=dev.legacybenefitsmn.com`,
      `SITE_URL=https://dev.legacybenefitsmn.com`, `ROUTE53_ZONE_NAME=legacybenefitsmn.com`,
      `GITHUB_BRANCH=develop`, `CRM_TRANSPORT=relay`,
      `CRM_RELAY_URL=https://dev.legacybenefitsmn.com/api/crm-inbox`, `CRM_RELAY_SECRET` random 32
      chars, `CRM_INBOX_ENABLED=true`, `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` set,
      `SES_FROM_ADDRESS=nbest@dev.legacybenefitsmn.com`, `LEAD_NOTIFICATION_EMAIL` a test inbox,
      `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` from a new Turnstile widget whose hostnames
      include `dev.legacybenefitsmn.com`, `DNS_EXTRA_RECORDS={}`, `MEDIA_HOST` same as prod or empty.
      Prod item: the eight new fields from Task 3 Step 10, plus `CRM_RELAY_URL` and
      `CRM_RELAY_SECRET` copied from the `Secrets` vault when prod is ready to go live (not now).

- [ ] **Step 2: Verify the dev item resolves**

Run: `APP_ENV=dev sh scripts/with-env.sh env | cut -d= -f1 | sort | diff - <(grep -Ev '^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)' app.dev.env | cut -d= -f1 | sort)`
Expected: only lines for ambient shell variables; every app.dev.env key present. No values printed.

- [ ] **Step 3: First dev apply from this machine**

Run: `op run --env-file=app.dev.env -- terraform -chdir=infra init -reconfigure -backend-config="key=dev/terraform.tfstate" && op run --env-file=app.dev.env -- terraform -chdir=infra plan -lock-timeout=10m -out=/tmp/dev.tfplan && terraform -chdir=infra show -json /tmp/dev.tfplan | scripts/plan-guard.sh infra/destroy-allowlist.txt`
Expected: every resource `create`, none `update`, none `destroy`; `aws_route53_zone.this` absent;
`data.aws_route53_zone.parent` read; `aws_scheduler_schedule.outbox[0]` present. Then:
`op run --env-file=app.dev.env -- terraform -chdir=infra apply -lock-timeout=10m /tmp/dev.tfplan`.
Expect 10 to 20 minutes (Aurora, ACM, CloudFront). Re-run `init -reconfigure` with the prod key
before any later prod plan from this machine.

- [ ] **Step 4: Merge the feature branch into `main`, then create `develop`**

`/ship` the branch. Then (owner or this session, after the prod deploy on `main` is green):
`git switch -c develop main && git push -u origin develop`. The push triggers the dev deploy.

- [ ] **Step 5: Verify dev**

Run, with values read through `op read` into variables, never echoed:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://dev.legacybenefitsmn.com/            # 401
curl -sS -o /dev/null -w '%{http_code}\n' -u "$U:$P" https://dev.legacybenefitsmn.com/ # 200
curl -sSI -u "$U:$P" https://dev.legacybenefitsmn.com/ | grep -i x-robots-tag           # noindex, nofollow
curl -sS https://dev.legacybenefitsmn.com/api/health                                   # 200 body
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://dev.legacybenefitsmn.com/api/crm-inbox/lead -d '{}' # 401
```

Submit one test lead through the dev site form with fake data. Within 5 minutes:
`curl -sS -H "Authorization: Bearer $JOB" https://dev.legacybenefitsmn.com/api/crm-inbox` lists it,
where `$JOB` comes from `aws lambda get-function-configuration --function-name legacybenefitsgroup-dev --query 'Environment.Variables.OUTBOX_JOB_TOKEN' --output text`
run with the shared AWS credentials. Prod: `curl -sS -o /dev/null -w '%{http_code}\n' https://legacybenefitsmn.com/` still 200, no auth prompt.

- [ ] **Step 6: Done-gate for the whole work**

Lint and format clean, changed-file tests pass (Tasks 1 to 5 commands), `pnpm docs:check`,
`terraform validate`, prod plan reviewed (Task 3 Step 10), dev verified (Step 5). Report each
command's last line verbatim.
