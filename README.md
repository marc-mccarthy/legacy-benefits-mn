# Legacy Benefits Group Website

Marketing site and lead-capture system for a Medicare insurance practice in
Minnesota. Next.js 16 / React 19, exported to static HTML, served from S3 through
CloudFront, with the lead pipeline on Lambda behind `/api/*`.

## Stack

| Layer     | Choice                                                  |
| --------- | ------------------------------------------------------- |
| Framework | Next.js 16 (App Router) · React 19 · TypeScript         |
| Styling   | Tailwind CSS v4, CSS-first `@theme` tokens              |
| Content   | Typed TypeScript modules under `src/content/`           |
| Database  | PostgreSQL — four lead tables, owned by Drizzle         |
| Motion    | Motion, reduced-motion aware                            |
| Carousel  | Embla                                                   |
| Forms     | React Hook Form + Zod, Cloudflare Turnstile             |
| Email     | AWS SES — see the note on network reachability below    |
| IaC       | Terraform 1.16, AWS provider 6.x — one root at `infra/` |

## Repository layout

<!-- generated:layout -->

```text
.github/
.vscode/
brand/
docs/
drizzle/
e2e/
infra/
public/
scripts/
src/
├── api/
├── app/
├── components/
├── content/
└── lib/
tests/
workers/
```

<!-- /generated:layout -->

## Content

Every page is authored in `src/content/` and rendered to static HTML at build
time. There is no admin interface: changing content means editing a module and
redeploying.

- `site.ts` — business identity, navigation, announcement, stats, compliance
- `home.ts` — the home page block list, rendered by `RenderBlocks`
- `services.ts`, `team.ts`, `articles.ts`, `events.ts`, `testimonials.ts`,
  `carriers.ts`, `faq.tsx`
- `media.ts` — the image slots
- `articles/<slug>.tsx`, `services/<slug>.tsx` — one body component each

## Getting started

```bash
op signin
pnpm install
pnpm dev
```

Env comes only from the committed `app.env`, which holds `op://` references.
`scripts/with-env.sh` resolves them with `op run` and refuses to start if any
`.env*` file exists. Terraform reads the same file:
`op run --env-file=app.env -- terraform -chdir=infra plan`.

Keys declared in `app.env` (names only):

<!-- generated:env -->

- **NEXT_PUBLIC_**: `NEXT_PUBLIC_CALENDLY_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_MEDIA_HOST`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- **TF_VAR_**: `TF_VAR_BUSINESS_ADDRESS`, `TF_VAR_BUSINESS_EMAIL`, `TF_VAR_BUSINESS_NAME`, `TF_VAR_BUSINESS_PHONE`, `TF_VAR_CALENDLY_URL`, `TF_VAR_DB_MAX_ACU`, `TF_VAR_DB_SECONDS_UNTIL_AUTO_PAUSE`, `TF_VAR_DNS_EXTRA_RECORDS`, `TF_VAR_DOMAIN_NAME`, `TF_VAR_GITHUB_SUBJECT_PREFIX`, `TF_VAR_GTM_ID`, `TF_VAR_LAMBDA_MEMORY_MB`, `TF_VAR_LEAD_NOTIFICATION_EMAIL`, `TF_VAR_MEDIA_HOST`, `TF_VAR_NAME`, `TF_VAR_REGION`, `TF_VAR_SES_FROM_ADDRESS`, `TF_VAR_TURNSTILE_SECRET`, `TF_VAR_TURNSTILE_SITE_KEY`
- **AWS**: `AWS_ACCESS_KEY_ID`, `AWS_REGION`, `AWS_SECRET_ACCESS_KEY`
- **BUSINESS**: `BUSINESS_ADDRESS`, `BUSINESS_EMAIL`, `BUSINESS_NAME`, `BUSINESS_PHONE`
- **CRM**: `CRM_RELAY_SECRET`, `CRM_RELAY_URL`, `CRM_TRANSPORT`
- **Other**: `DATABASE_URL`, `DOMAIN_NAME`, `LEAD_NOTIFICATION_EMAIL`, `OUTBOX_JOB_TOKEN`, `PAYLOAD_SECRET`, `PGPOOL_MAX`, `SES_FROM_ADDRESS`, `TURNSTILE_SECRET`

<!-- /generated:env -->

No database is needed to run or build the site. One is needed only to submit a
form locally:

```bash
pnpm db:create
pnpm drizzle:migrate
```

Test projects have different needs. `pnpm test:unit` needs no database.
`pnpm test:integration` requires `DATABASE_URL`. `pnpm test:e2e` runs Playwright
against the static export in `out/` and the API bundle. `pnpm test`
runs every Vitest project.

## Keeping docs correct

The pre-commit fix step runs `docs-generate` on every commit (`pnpm docs:generate`, then it stages exactly the files it rewrote) and `diagrams-build` when `src/lib`, `src/api`, the `docs/diagrams` sources or the diagram scripts change (`pnpm diagrams:build`, which stages `D5-module-map.mmd`, `SOURCES.md` and `diagrams.manifest.json`). Both run before prettier and eslint. The commit is blocked if `package.json`, `app.env` or a rewritten file has unstaged edits.

The verify step runs `pnpm docs:check` (references, plus generated blocks compared byte for byte) and `pnpm diagrams:check`. Pre-push and CI run both.

A generated block sits between an opening marker and a closing marker. The opening marker is the word `generated:NAME` inside an HTML comment, `NAME` being `scripts`, `env` or `layout`. The closing marker adds a slash before `generated`. Never edit between them.

`pnpm docs:sync [ref]` (default `main`) is an on-demand `claude -p` pass over docs and diagrams. No hook runs it. It ends by running the generators and checks. Hand-written prose and hand-drawn diagrams are checked for references only, not for truth.

## Commands

<!-- generated:scripts -->

| Command                  | Runs                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`               | `sh scripts/with-env.sh next dev`                                                                  |
| `pnpm build`             | `sh scripts/with-env.sh next build`                                                                |
| `pnpm start`             | `next start`                                                                                       |
| `pnpm lint`              | `eslint`                                                                                           |
| `pnpm format`            | `prettier --write .`                                                                               |
| `pnpm format:check`      | `prettier --check .`                                                                               |
| `pnpm typecheck`         | `tsc --noEmit`                                                                                     |
| `pnpm test`              | `sh scripts/with-env.sh vitest run`                                                                |
| `pnpm test:unit`         | `vitest run --project 'unit*'`                                                                     |
| `pnpm test:integration`  | `sh scripts/with-env.sh vitest run --project integration`                                          |
| `pnpm test:coverage`     | `vitest run --project 'unit*' --coverage`                                                          |
| `pnpm test:watch`        | `vitest --project 'unit*'`                                                                         |
| `pnpm test:e2e`          | `sh scripts/with-env.sh playwright test`                                                           |
| `pnpm drizzle:generate`  | `drizzle-kit generate`                                                                             |
| `pnpm drizzle:migrate`   | `sh scripts/with-env.sh drizzle-kit migrate`                                                       |
| `pnpm db:status`         | `pg_isready`                                                                                       |
| `pnpm db:create`         | `createdb legacybenefitsmn`                                                                        |
| `pnpm db:drop`           | `dropdb --if-exists legacybenefitsmn`                                                              |
| `pnpm db:psql`           | `psql -d legacybenefitsmn`                                                                         |
| `pnpm db:reset`          | `pnpm db:drop && pnpm db:create && pnpm drizzle:migrate`                                           |
| `pnpm db:server:init`    | `initdb -D .pgdata`                                                                                |
| `pnpm db:server:start`   | `pg_ctl -D .pgdata -l .pgdata/server.log start`                                                    |
| `pnpm db:server:stop`    | `pg_ctl -D .pgdata stop`                                                                           |
| `pnpm diagrams:derive`   | `node scripts/generate-derived-diagrams.mjs`                                                       |
| `pnpm diagrams:build`    | `node scripts/generate-derived-diagrams.mjs && node scripts/generate-diagrams.mjs`                 |
| `pnpm diagrams:check`    | `node scripts/generate-derived-diagrams.mjs --check && node scripts/generate-diagrams.mjs --check` |
| `pnpm reference:capture` | `node scripts/capture-reference-site.mjs`                                                          |
| `pnpm reference:check`   | `node scripts/capture-reference-site.mjs --check`                                                  |
| `pnpm docs:check`        | `node scripts/check-doc-references.mjs && node scripts/generate-doc-sections.mjs --check`          |
| `pnpm docs:generate`     | `node scripts/generate-doc-sections.mjs`                                                           |
| `pnpm docs:sync`         | `bash scripts/docs-sync.sh`                                                                        |
| `pnpm check`             | `lefthook run verify-all`                                                                          |
| `pnpm prepare`           | `lefthook install`                                                                                 |

<!-- /generated:scripts -->

## Lead capture

A submission to `/api/leads` writes one row to `leads` and one to `crm_outbox`
in a single transaction, stores the consent text exactly as it was shown with its
version and a timestamp, and returns `201`. `/api/jobs/outbox` drains the outbox
with `FOR UPDATE SKIP LOCKED`, backoff and leases. Suppressed contacts are
stored, never queued, and receive the same response.

`PAYLOAD_SECRET` is the salt for `ip_hash`. It is named after the CMS that used
to be here and is still read by `src/lib/leads/service.ts`; rotating it severs
every existing hash, and nothing reports that.

## The deployed Lambda reaches the internet over IPv6 only

Observed in `infra/main.tf` and `infra/compute.tf`: the API Lambda runs in
private subnets whose route table carries one internet route, `::/0` through an
egress-only internet gateway, plus an S3 gateway endpoint. There is no NAT
gateway and no `0.0.0.0/0` route. Outbound calls therefore succeed only to hosts
that answer over IPv6. The application uses default endpoints with no dual-stack
configuration, so these calls are unverified in the deployed environment:

- **SES** — lead notification and confirmation email
- **Cloudflare Turnstile** — token verification at
  `challenges.cloudflare.com`
- **CRM webhook delivery** — any transport that posts outward

Lead data is stored before any of them runs. Adding IPv4 egress is an
infrastructure change nobody has made.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It builds the site
and packs `api-bundle/`, applies `infra/` with Terraform (S3 state, plan guard
against unlisted destroys), uploads the API and migration packages, runs the
migration function, syncs `out/`, `public/media` and `public/video` to S3, and
invalidates CloudFront. `.github/workflows/terraform.yml` validates `infra/` on
pull requests.

CloudFront serves the static site from S3 by default and routes `/api/*` to the
Lambda. A CloudFront Function rewrites extensionless paths onto the `.html` files
the export writes, and a `404` from S3 maps to `/404.html`.
