# Nate's website updates: execution plan

Source list: `docs/updates-to-nates-website.md`. Ledger: `docs/plans/nate-site-updates.baton.json`.

Run with mj-baton: the main session orchestrates, reviews every diff inline and owns git.
Each small task goes to one expert agent, which reports back with file:line evidence and the output of its accept commands.

## Routing

| Difficulty | Agent                                  | Model            |
| ---------- | -------------------------------------- | ---------------- |
| discovery  | `mj-baton:scout`                       | Haiku, read-only |
| medium     | `mj-baton:executor`                    | Sonnet           |
| hard       | main session or `mj-baton:architect`   | Opus             |
| asset      | `baton run` (Gemini, `asset-designer`) | flash-high       |

## Rules for every task

- Branch per big task off `main`. Never work on `main`. The main session commits after review.
- Zero code comments. Match surrounding style. No dead code.
- Changed behaviour gets new or updated tests. Never weaken a test to pass.
- Accept commands must exit 0: `pnpm typecheck`, `pnpm exec eslint <paths>`, `pnpm exec prettier --check <paths>`, `pnpm exec vitest run --project 'unit*'`, plus the task's e2e spec.
- e2e runs against a static build made with CI-like values: `BUSINESS_NAME="Legacy Benefits Group" BUSINESS_PHONE="(651) 260-1003" NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 pnpm exec next build`.
- Report format: what changed (path:line), commands run with exit codes and their last lines, anything unsure.

## Owner decisions needed before the blocked tasks start

| Ref | Question                                                                                                                                                           | Blocks |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| D1  | Decided 2026-10-13: remove the home stat, the home band numbers and the FAQ sentence. The TPMO disclaimer stays at 8 / 42 until the owner gives the correct counts | M4     |
| D2  | Decided 2026-10-13: remove the photo of Nate with his daughter. Other home pictures stay                                                                           | M5     |
| D3  | Decided 2026-10-13: `nbest@legacybenefitsmn.com`                                                                                                                   | M6, M7 |
| D4  | Approve the bio copy written in T3.1                                                                                                                               | T3.2   |
| D5  | Approve the terraform plan before apply                                                                                                                            | T7.4   |

## M1: Ship the final hero (PR #11)

Goal: the live maze is the GIF rebuild: transparent, plays once.

| Task | Small task                                                                              | Difficulty, agent |
| ---- | --------------------------------------------------------------------------------------- | ----------------- |
| T1.1 | Read PR #11 CI results; list failing tests, split into pre-existing on `main` vs new    | discovery, scout  |
| T1.2 | Fix any new PR #11 failure on `feat/maze-hero-final`                                    | medium, executor  |
| T1.3 | Owner merges PR #11; confirm the deploy run is green and `/` serves `hero-maze-run.mp4` | easy, main        |

## M2: Legacy Benefits Group logo (`feat/brand-logo`, in progress)

Goal: header tree icon + LEGACY / BENEFITS GROUP wordmark, full logo with a gold arc in the footer, trees favicon. All from `public/media/logo/lbg-sprite.svg`, built by `scripts/logo-sprite.mjs` from `brand/logo/`.

| Task | Small task                                                                                                       | Difficulty, agent                  |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| T2.1 | Visual check of header (1440, 390, 360, stuck) and footer; tune sizes so nothing overflows at 360                | medium, executor (frontend-design) |
| T2.2 | Rewrite `tests/components/ui/brand-mark.test.tsx` for `BrandLockup` / `BrandLogo`, the sprite ids and `icon.svg` | medium, executor                   |
| T2.3 | Update the brand e2e checks in `e2e/structure.spec.ts` and `e2e/zoom.spec.ts` for the SVG logo                   | medium, executor                   |
| T2.4 | Regenerate `src/app/favicon.ico` from `src/app/icon.svg`                                                         | easy, executor                     |
| T2.5 | Gemini design and WCAG review of the screenshots                                                                 | review, `baton review`             |
| T2.6 | Propose the `CLAUDE.md` media-table update (owner approves the doc edit)                                         | easy, main                         |

## M3: Nate's bio

Goal: the Meet Nate bio mentions volleyball, his daughter, his dogs Doyle and Mitka, basketball and the family cabin in Wisconsin.

| Task | Small task                                                                                                                      | Difficulty, agent |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| T3.1 | Draft 2-3 bio options in the site's voice (plain, warm, 16px senior-friendly); owner picks (D4)                                 | hard, main        |
| T3.2 | Put the chosen bio in `src/content/team.ts`; update `tests/content/content.test.ts`; check the Meet Nate layout at 1440 and 390 | medium, executor  |

## M4: The "8 carriers" line (needs D1)

| Task | Small task                                                                                                                                                                           | Difficulty, agent |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| T4.1 | Edit the chosen lines in `src/content/site.ts` (stats), `src/content/home.ts` (noise heading), `src/content/faq.tsx`; set `compliance.orgCount` / `planCount` to the owner's numbers | medium, executor  |
| T4.2 | Update the count tests in `tests/content/content.test.ts` and any e2e that reads the stats or the heading                                                                            | medium, executor  |

## M5: Home page pictures (needs D2)

| Task | Small task                                                                                                                      | Difficulty, agent |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| T5.1 | List every picture on `/`: block, component, media slot, file, and which tests reference it                                     | discovery, scout  |
| T5.2 | Remove the chosen pictures or blocks from `src/content/home.ts` and their components; keep every block readable with no picture | medium, executor  |
| T5.3 | Update the affected tests in `tests/` and `e2e/` (`structure.spec.ts`, `motion.spec.ts`, `parity.spec.ts`, `budget.spec.ts`)    | medium, executor  |
| T5.4 | Ask before deleting media files that nothing uses any more                                                                      | easy, main        |

## M6: Nate's email (needs D3)

| Task | Small task                                                                                    | Difficulty, agent |
| ---- | --------------------------------------------------------------------------------------------- | ----------------- |
| T6.1 | Set the confirmed address in `src/content/team.ts`; grep for the other spelling; update tests | easy, executor    |

## M7: Contact form to Nate's email and Postgres (needs D3, D5)

Goal: a real submission lands in the `leads` table and in Nate's inbox.

| Task | Small task                                                                                                                                                                 | Difficulty, agent               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| T7.1 | Trace the submit path: `src/lib/leads/service.ts`, `src/lib/email/index.ts`, `src/lib/business.ts`, the API route; confirm the tests cover the insert and the notification | discovery, scout                |
| T7.2 | Owner sets `lead_notification_email` (and `ses_from_address` if missing) in 1Password `Development/legacy-benefits-mn-infra`                                               | easy, owner                     |
| T7.3 | `terraform plan` with the new values; report the diff (Lambda env, SES identity)                                                                                           | hard, architect (terraform-aws) |
| T7.4 | Apply after the owner approves (D5); verify the SES identity and DKIM status                                                                                               | hard, main                      |
| T7.5 | One live test submission: the row exists in `leads`, the email arrives, the outbox drains                                                                                  | hard, main                      |
