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

No database is needed to run or build the site. One is needed only to submit a
form locally:

```bash
pnpm db:create
pnpm drizzle:migrate
```

## Commands

| Command                   | What it does                                 |
| ------------------------- | -------------------------------------------- |
| `pnpm dev`                | Development server                           |
| `pnpm build`              | Static export to `out/`                      |
| `pnpm lint` / `typecheck` | ESLint / `tsc --noEmit`                      |
| `pnpm test`               | Vitest, all projects                         |
| `pnpm test:unit`          | Vitest, no database required                 |
| `pnpm test:integration`   | Vitest, requires `DATABASE_URL`              |
| `pnpm test:e2e`           | Playwright against `out/` and the API bundle |
| `pnpm drizzle:migrate`    | Apply the lead-table migrations              |

`docs/DEVELOPMENT.md` covers the build-time environment variables, the API
bundle, and the Turnstile failure mode.

## Lead capture

A submission to `/api/leads` writes one row to `leads` and one to `crm_outbox`
in a single transaction, stores the consent text exactly as it was shown with its
version and a timestamp, and returns `201`. `/api/jobs/outbox` drains the outbox
with `FOR UPDATE SKIP LOCKED`, backoff and leases. Suppressed contacts are
stored, never queued, and receive the same response.

`PAYLOAD_SECRET` is the salt for `ip_hash`. It is named after the CMS that used
to be here and is still read by `src/lib/leads/service.ts`; rotating it severs
every existing hash, and nothing reports that.

## The deployed Lambda has no route to the public internet

Observed in `infra/`: the Lambda runs in private subnets whose route table
carries no `0.0.0.0/0` route, and there is no NAT gateway, internet gateway or
VPC endpoint. Three things in the application therefore cannot succeed in the
deployed environment:

- **SES** — lead notification and confirmation email
- **Cloudflare Turnstile** — token verification at
  `challenges.cloudflare.com`
- **CRM webhook delivery** — any transport that posts outward

A deployed form submission stores the lead and then fails to notify anyone. Lead
data is not lost; the notification is. Adding a network path is an infrastructure
change nobody has made.

## Deployment

`.github/workflows/deploy.yml` builds the site, uploads `out/` to S3, packs
`api-bundle/` as the API function, and invalidates CloudFront. `infra/` holds the
Terraform. Nothing in this repository applies it.

CloudFront serves the static site from S3 by default and routes `/api/*` to the
Lambda. A CloudFront Function rewrites extensionless paths onto the `.html` files
the export writes, and `403` and `404` from S3 both map to `/404.html`.
