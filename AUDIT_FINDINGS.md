# Audit findings — UI redesign

Task document. Written 2026-09-25, after a 79-agent audit and a subsequent verification pass by
three independent agents. It replaces `AUDIT_SPEC_UI_REDESIGN.md`, which was deleted from the repo
root by another session mid-read and is not recoverable — it was untracked. This file is current
rather than a reconstruction.

Every figure below was produced by a command run against the tree in its present state. Where a
claim was not executed, it says so.

---

## 1. Current state, measured

```text
node node_modules/typescript/bin/tsc --noEmit        0 errors
node node_modules/eslint/bin/eslint.js .             0 errors, 2 warnings
node node_modules/vitest/vitest.mjs run --project unit   36 files / 678 tests pass
NODE_OPTIONS=--max-old-space-size=4096 pnpm build    completes, 30 HTML files
env TURNSTILE_SECRET= npx playwright test            290 passed, 0 failed, 0 skipped
git rev-parse HEAD                                   d72ddc6, equal to origin/main
```

Both lint warnings are `@typescript-eslint/no-unused-vars` in
`technomancy_artifacts/SPEC_UI_UPDATE__20260918-221808/.probe-tm-htm1-9/`, from a prior run.

`vitest run` across all projects fails 9 tests in `src/lib/leads/outbox.int.test.ts` with
`connect EPERM 127.0.0.1:5432`. Same file, same count, same cause as `baseline_checks.md` recorded
before any edit. Environmental, not a regression.

---

## 2. Reporting failures during this work

These are errors in what was _said_, not in the code. They are listed first because they are the
reason an audit was needed at all.

1. **`pnpm lint` was reported clean while exiting 1.** `run_summary.md:12` states "0 errors, 2
   warnings". The command exited 1 on `react-hooks/set-state-in-effect` at `stats-band.tsx:24`. The
   error was introduced by this work — a `setDisplay(0)` added while fixing a real SSR bug. Fixed:
   the `requestAnimationFrame` tick already sets the eased value on its first frame, so the explicit
   reset was redundant.
2. **`run_summary.md` §6 attributes to a permission gate work that was never dispatched.** The
   strings `permission gate`, `refused by` and `irreversible` appear in none of the seven
   technomancer logs. Those logs say the tasks were _held back_:
   `technomancer_chat_HTM-5.md:10`, `:207`, `:373`. `TM-HTM5-4` is a downscale, not a deletion, and
   was swept under the same wording. An orchestration choice reported as an environmental block.
3. **`run_summary.md` §3 calls the e2e baseline impossible when the run's own plan recorded it as
   available.** `high_technomancer_chat.md:144` measured `out/index.html` at 01:04:12 with no newer
   source, and concluded the baseline was capturable without a rebuild. The task never ran, the
   window closed, and AC-4 lost its comparator.
4. **`run_summary.md` §9 presents an in-run fix as a post-run discovery.** The three-missing-`<h1>`
   defect was found and fixed by `TM-HTM7-3`/`-4`, recorded at `technomancer_chat_HTM-7.md:81-98`.
5. **"34 pages" against a measured 30.** `run_summary.md:17`. `find out -name '*.html' | wc -l`
   returns 30.
6. **A tracked file was deleted and the scope section did not say so.**
   `SPEC_UI_REDESIGN_RESEARCH.md` was deleted; FR-98 named only `SPEC_UI_REDESIGN.md`. Restored from
   `d72ddc6` on 2026-09-25, 55,859 bytes.
7. **A grep scoped to `src/` was reported as covering the repository.** `e2e/motion.spec.ts`
   still queried `[data-hero-parallax]` after that component was deleted, so the test passed
   _vacuously_ — `el` was always `null` and the assertion accepts `transform === null`. Test deleted.
8. **Three stale `serve-e2e` processes were left bound to port 3100.** They had loaded `.env` with a
   real `TURNSTILE_SECRET`; `reuseExistingServer` handed them to later suites, producing false
   `lead-form.spec.ts:45` failures.
9. **Suites and builds were run concurrently with a verification agent.** Its run failed on a test
   deleted mid-run. Both sets of results were contaminated; the figures in §1 come from a serial run
   on a quiescent tree.
10. **"43 HTML files" — a glob that double-counted.** The figure is 30.
11. **Two environment facts were propagated to a dozen agent briefs without being tested.** `pnpm`
    was said to die in the sandbox: in fact only registry operations fail (EPERM on
    `/Users/mj/.cache/pnpm`), and `pnpm lint` exits 0 in-sandbox. `next build` was said to hang: it
    completes in-sandbox at exit 0.
12. **A claim that the deleted files were referenced by nothing was false.** `src/content/media.ts`
    and `media-manifest.json` still declared `team.headshot` and `testimonials.photo`. A deletion
    command issued on that basis would have left the content model pointing at missing files. Both
    slots have since been removed.

---

## 3. Process: the audit workstream never ran

`high_technomancer_HTM-8_conclave_plan.md` defines 11 tasks. `technomancer_chat_HTM-8.md` does not
exist. Only `TM-HTM8-11` (delete the spec) and `TM-HTM8-10` (write the summary, done by hand) were
performed. `TM-HTM8-1` published its constraints but never wrote `baseline_e2e.md`.

**Eight tasks — `TM-HTM8-2` through `-9` — have no execution evidence.** Those eight are the audit
itself: the test-delta audit, the `data-*` sweep, the 33-pair contrast re-measurement, the byte
restatement, the FR-93 prose sweep, the grep sweeps, the §9.3 check set, and the 68-row acceptance
audit.

Of 27 milestones, six ran nothing: `MS-WS5-2`, `MS-WS5-4`, `MS-WS8-1`, `-2`, `-3`, `-4`. Two are
partial: `MS-WS5-1`, `MS-WS8-5`. `project_plan.md`'s Coverage Gate reads PASS with zero gaps — that
is a _planning_ claim (every item has an owner) and is accurate on its own terms. It was never an
execution claim, and reporting it as though the protocol had completed was the error.

---

## 4. Contrast: every pair clears its floor; the figures move with the sampling point

Measured three times by two parties. **Every pair clears its floor with a wide margin.** The spread
between passes is a sampling artefact, not disagreement about the design — the hero ground is a
shader gradient, so "the brightest ground pixel" depends on which pixel you pick and whether the
consent card and the floating header are still on screen when you pick it.

| Pair                                 | Independent pass A | Independent pass B | Floor |
| ------------------------------------ | ------------------ | ------------------ | ----- |
| Hero `h1`, white on brightest ground | 18.36:1            | 17.27:1            | 3     |
| Hero subheading                      | 18.36:1            | 18.78:1            | 4.5   |
| Nav links, white on hero ground      | 19.64:1            | 19.17 – 20.61:1    | 4.5   |
| Hero CTA label `#000` on `#00F5F3`   | 15.36:1            | 15.3552:1          | 4.5   |
| Nav CTA outline `#79858F`            | 5.20:1             | 4.86 – 5.02:1      | 3     |

Method for pass A, reproducible: dismiss the consent card via its Accept control, hide the header,
footer and every `main h1/h2/p/a/button/img` so only painted ground remains, confirm two canvases are
still painting, screenshot the band's own rect, and take the maximum-luminance pixel. That yields
`rgb(0, 24, 24)` and **18.36:1** for white text. Hiding the shader's canvas subtree as well yields
pure black and 21.00:1 — the no-WebGL case, which matches the fallback measured in §5.

**Two earlier statements in this file were wrong and are withdrawn:** that the published figures
"were not the measured ones", and that the `h1` pair measures 17.27:1 rather than 18.36:1. Both
numbers are reproducible from their own sampling method; neither is an error.

Lowest text pair reported anywhere on the home route: **4.79:1** (floor 4.5). Lowest non-text pair:
**4.86 – 5.02:1** (floor 3). Not independently re-derived here.

The nav CTA ring is a `box-shadow … inset`, not a border. The `::selection` figure of 18.52:1 is
unconfirmed; the mechanism — resolving per scheme through `--scheme-accent` / `--scheme-on-accent` —
is confirmed, and it replaced a global rule that measured 1.04:1 on dark bands.

---

## 5. Verified behaviour

Measured, not asserted.

- **15 routes / 30 built pages each carry exactly one `<h1>`.** Three routes (`/services`, `/team`,
  `/learn`) previously had none.
- **No text below 16px** on any route at 1440, 720 or 360px. The minimum computed size is exactly
  16px.
- **No horizontal overflow** in 27 route × width combinations, including 200% and 400% zoom.
- **Axe: see §8 item 1 — this bullet was wrong.** The suite's 10 routes pass, but only because it pins `reducedMotion: "reduce"`.
- **Zero React errors, pageerrors or unhandled rejections** across 60 combinations of route ×
  {1440, 390} × {reduce, no-preference}. The React #418 hydration error on `/` is fixed.
- **JavaScript disabled:** every route renders its headings and copy, no blank or zero-height band,
  and no zero-placeholder text. The home stats render `11`, `1,400+`, `8`, `3`. Before the fix the
  export carried `>0<` four times.
- **WebGL unavailable:** the hero renders an 848px band on `rgb(0,0,0)` with the `h1` visible, zero
  shader canvases, zero page errors.
- **Reduced motion:** zero `<canvas>` on all 15 routes; all 63 lit words at `opacity: 1`.
- **Print:** zero blank bands, all four `[data-compliance]` elements visible, shader and particle
  field hidden.

---

## 6. Open items

1. **37 of 65 files under `public/media/` are unreferenced — 25,286,538 B (24.12 MiB).** Nothing in
   `src/`, `e2e/`, `media-manifest.json` or the built output points at them. Seven of them
   (`pagesslides-20241011-*`) were acquired _by this work_ under FR-60 and orphaned hours later when
   the hero dropped its photograph. Removal is blocked by a harness permission gate, not by anything
   in the repository — `CLAUDE.md`, `AGENTS.md` and `.claude/settings.local.json` contain no
   prohibition on deletion, and the spec orders several of these removals.

   ```text
   7 × pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro*
   7 × pagesposter-historic-bluff-country-scenic-byway-bluffs-of-th*
   7 × pagesslides-20241011-fs-r9spfo-bs-037-fallcolors-lakesupe*
   7 × pagesslides-superior-hiking-trail-autumn-tettegouche-state-p*
   7 × servicesimage-minneapolis-april-2025-28-skyline-and-mississi*
   1 × teamheadshot-confident-handsome-adult-man-in-blue-shirt-sitt.jpg
   1 × testimonialsphoto-happy-senior-couple-sitting-outdoors-on-a.jpg
   ```

   `public/video/hero-bg.mp4` (2,382,895 B) and `public/video/hero-bg-poster.jpg` (133,910 B) are
   also unreferenced, except that the poster's _path string_ appears as a fixture in
   `src/lib/image-loader.test.ts`. That test passes a literal to a pure function and never reads
   disk, so deleting the file does not break it.

2. **The FR-93 deletion list is incomplete.** `run_summary.md` §10 names only
   `e2e/structure.spec.ts`. Prose was also removed from `e2e/navigation.spec.ts` and
   `docs/MEDIA-CREDITS.md`. FR-93 exists so each deletion can be vetoed.

3. **`data-hero-parallax` was removed although the spec marked it "Preserved"** (`SPEC_FULL.md:725`,
   FR-26). The removal followed from dropping the hero photograph, which the owner directed; it is
   recorded here because it crossed a stated requirement rather than because it is believed wrong.

4. **The audit's own totals could not be re-checked.** `AUDIT_SPEC_UI_REDESIGN.md` §2.5–2.10, §7 and
   §8 were deleted before any verifier read them. Thirteen of its individual verdicts were
   spot-checked and all thirteen held; its aggregate counts (FR 85/12/1, AC 54/13/1) are unverified.

---

## 7. Reproducing this

```bash
cd /Users/mj/Repos/legacy-benefits-mn
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run --project unit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
find out -name '*.html' | wc -l

# Kill anything already bound to 3100 first; reuseExistingServer is on outside CI
# and a stale server that loaded .env will fail lead-form.spec.ts.
for p in $(lsof -ti:3100); do kill -9 $p; done
env TURNSTILE_SECRET= npx playwright test --reporter=line

git rev-parse HEAD; git diff --cached --stat; git stash list
```

---

## 8. Adversarial verification, 2026-09-25

A `verifier` agent that wrote none of this work re-checked every claim above. Its findings, each
re-reproduced here before being recorded.

### 1. "Zero axe violations" was false — and the attempted fix was worse

`/services` produces three `color-contrast` violations (1.37, 1.96, 2.92:1) with **no** reduced-motion
preference. Reproduced independently:

```text
no-preference   color-contrast x3
reduce          NONE
```

`e2e/accessibility.spec.ts` pins `reducedMotion: "reduce"` at file scope, and `LitWords` renders
its overlay `style={reduced ? { opacity: 1 } : { opacity }}`. Under the preference the overlay is
forced opaque, so the suite cannot see the fractional-opacity state that exists at rest for later
words in the scroll window.

**No sighted user is affected.** `LitWords` paints each word twice — a full-opacity `text-muted` base
with the `aria-hidden` lit copy above it. Composited pixels measure 9.667:1 at worst. Axe scores the
overlay in isolation and ignores the word painted underneath.

**An attempted fix was reverted.** Replacing the two stacked spans with a single span whose colour
was `color-mix()`-interpolated silenced axe, but the declaration is invalid at computed-value time —
a `calc()` over an unregistered custom property is a token substitution inside `color-mix()`, so
every word silently inherited the paragraph's colour and the lighting effect was dead. Registering
the property with `@property` did not resolve it either. The original implementation is restored: a
working effect with a cosmetic tooling finding beats a silent no-op with a clean report.

**Open.** Either accept the finding as a known false positive, or rebuild the effect on a mechanism
that never paints partly-transparent text.

### 2. `pnpm build` failure was a poisoned Turbopack cache

The verifier measured `exit 1` on three attempts, sandboxed and not:

```text
TurbopackInternalError: Failed to write app endpoint /sitemap.xml/route
Caused by: creating new process - binding to a port - Operation not permitted
```

Reproduced, then resolved: `rm -rf .next` and the build completes, twice in a row. Not a code defect.
**§2 item 11's correction — "`next build` completes in-sandbox at exit 0" — is too strong**: it
completes when the cache is sound, and fails on a poisoned one regardless of sandbox.

### 3. Corrections to this file

- `src/lib/image-loader.test.ts` fixture is at **`:71–72`**, not `:81`.
- §3 contradicts itself: `TM-HTM8-1` "published its constraints" yet `MS-WS8-1` is listed among the
  six that ran nothing. It is **partial**, not empty.
- §6 item 3 names `data-hero-parallax` as the only crossed "Preserved" row. `SPEC_FULL.md` also marks
  **`data-hero-frame`** and **`data-active`** Preserved, both sourced from the deleted
  `hero-motion.tsx`, and lists `hero-video.tsx` among `data-running`'s sources.
- `stats-band.tsx`'s comment says the count-up "rewinds to 0 in the effect". There is no rewind — the
  first `requestAnimationFrame` tick writes `Math.round(value * ~0)`. Same outcome, drifted comment.

### 4. Not recorded above, found by the verifier

- **`src/app/(site)/team/team-video.tsx` is unreachable dead code.** `TeamVideoSection` is exported
  and imported nowhere. Pre-existing at `d72ddc6`. It carries two dangling references:
  `TEAM_VIDEO_FILENAME` names a file absent from `public/video/`, and `CONTENT_VIDEO_CAPTIONS_PATH`
  points at `/captions/content-video.vtt`, which has no backing directory under `public/` — while a
  live route `src/app/(site)/captions/content-video.vtt/route.ts` serves captions for a component
  nobody renders.
- **`api-bundle/index.mjs` is older than `out/`.** Every 290-pass figure was taken against that
  pairing. It caused no failure; it is an unstated condition of the result.
- **§7's reproduction block omits `node scripts/build-api-bundle.mjs`**, which
  `high_technomancer_chat.md:136` names as a precondition — without it `serve-e2e.mjs` answers `/api/`
  with 503, and with a stale one it serves an old handler.

### 5. Confirmed unchanged

The verifier reproduced §6 item 1 byte-for-byte (65 files, 37 unreferenced, 25,286,538 B, identical
7/7/7/7/7/1/1 grouping), confirmed the media chain is fully consistent end to end
(manifest ↔ `media.ts` ↔ disk ↔ built output ↔ `MEDIA-CREDITS.md`, no dangling entry either
direction), confirmed §2 items 2–7 and 12, and confirmed §5's `<h1>`, 16px-floor, overflow, no-JS,
reduced-motion and WebGL-off results independently. It searched for a third vacuously-passing test
and **found none**.

State after this section's work: tsc 0 errors, eslint 0 errors, unit 36 files / 678 tests,
`pnpm build` completes, Playwright **290 passed / 0 failed / 0 skipped**.

---

## 9. Second verification pass, 2026-09-25

Two agents that wrote none of this work re-checked it: one re-measured §1 serially on a quiescent
tree, one read the diff against the six areas §8 rests on. Every finding below was re-reproduced by
hand before being written here.

### 9.1 §1 holds

Re-measured serially: tsc 0 errors; eslint 0 errors / 2 warnings, both
`no-unused-vars` in `technomancy_artifacts/.../.probe-tm-htm1-9/{mask,seam}.mjs`; unit 36 files /
678 tests; build completes at 30 HTML files; Playwright 290 passed / 0 failed / 0 skipped.
`vitest run` across all projects still fails the same 9 `outbox.int.test.ts` tests on
`connect EPERM 127.0.0.1:5432`.

### 9.2 Open item 4 is closed, and was overstated

`node scripts/build-api-bundle.mjs` produced a **byte-identical** file — sha256
`29b711b2fa86f171c523257101550eb62f20b72d4e3ca11992782411212292a2`, 2,255,677 B, only the mtime
moved. `api-bundle/` was stale by timestamp, not by content, so the 290 figure was never conditional
on it. The e2e run above was taken after the rebuild regardless.

### 9.3 Three claims in §8 are wrong

- **§8.3 "there is no rewind" overstates it.** The literal `setDisplay(0)` is gone, but the first
  `requestAnimationFrame` tick still writes a rewound value: at one 16.7 ms frame of the 1200 ms
  ease, `1400` renders `58`. `1,400+` visibly drops and counts back up. The comment's wording is
  imprecise, not false.
- **§8.5 "searched for a third vacuously-passing test and found none" is false.** Both `it`s in
  `describe("no two people share a photograph")` in `src/content/content.test.ts` are vacuous: every
  `photo:` field in `src/content/team.ts` and `src/content/testimonials.ts` is `null`, so `used` is
  `[]` and each assertion reduces to `expect(0).toBe(0)`. `git show 'd72ddc6:…'` shows the same six
  nulls and the same block, so it is pre-existing — but removing the `team.headshot` and
  `testimonials.photo` slots makes it permanently unfalsifiable. Left unfixed by owner's decision.
- **§8.4's `CONTENT_VIDEO_CAPTIONS_PATH` "dangling" is refuted.** The route is `force-static` and
  `out/captions/content-video.vtt` exists at 1,174 B. `TEAM_VIDEO_FILENAME` is still absent from
  `public/video/`, and `TeamVideoSection` is still imported nowhere.

### 9.4 §8.2's build account, corrected again

Observed in this pass, in order: a sandboxed build failed on `binding to a port`; the same build
with the sandbox **off** failed identically, which is what §8.2 claims; `rm -rf .next` then moved the
failure to `Failed to fetch Archivo from Google Fonts`; and a clean `.next` plus an unsandboxed run
completed at 30 HTML files. So a clean cache needs font egress, and a poisoned one fails either way.

### 9.5 The accessibility suite was blind at `no-preference`

`e2e/accessibility.spec.ts` pinned `reducedMotion: "reduce"` at file scope, unopposed by
`playwright.config.ts` (whose only `reducedMotion` sits in the project scoped to
`motion.spec.ts`). All 10 routes were audited only in the settled state, so the hero shader, the
particle field, every mid-reveal state and lit-words at rest were never inspected on any route.

Rewritten to run each route under both `reduce` and `no-preference`, with two mechanisms added:

- `settleReveals()` pins `[data-reveal]` to its end state with an injected stylesheet, then scrolls
  the page so viewport-triggered content and the consent dialog are present, then asserts every
  reveal reads exactly `opacity: 1`. Without it `/events` reported mid-fade blends such as `#e5e7e9`
  on `#ffffff` rather than resting colours — 5 nodes at 1.23–1.34 in one run, 5 at 1.17–1.24 and 8
  at 1.32–3.75 in others; the count and ratios move with timing, the class does not.

  A first version waited for every opacity to be 0 **or** 1. That predicate was true on the first
  poll in 12 of 12 probe runs, so it contributed no waiting at all and every settle came from the
  scroll pass's 120 ms sleeps. Replaced rather than left as a latent flake. `Curtain` animates
  `clip-path` rather than opacity and is still not waited on.

- `.exclude("[data-lit-word]")` drops the `aria-hidden` lit copy. Falsified rather than assumed:
  with the exclusion removed, `/services` reports 4 `color-contrast` violations at 3.4, 2.21, 1.52
  and 1.1, **every node a `[data-lit-word]`**. §8.1's "three violations at 1.37, 1.96, 2.92" does not
  reproduce; the class is the same, the count and ratios move with the scroll position.

The composited floor was re-derived independently: `--scheme-muted` `#384654` on `--scheme-surface`
`#ffffff` has relative luminance 0.0586, giving `1.05 / 0.1086` = **9.67:1**, and the overlay
interpolates monotonically toward `#000` at 21:1.

Run three times after the rewrite: 42 passed each time. Up from 22 tests — 10 routes × 2 preferences × 2 projects, plus the `h1` test.

### 9.6 `/events` lost its whole-card link

`after:absolute after:inset-0` is present at `d72ddc6:src/app/(site)/events/page.tsx` and absent
after the card was extracted into `EventCard`, while `learning-grid.tsx` and `team-grid.tsx` kept it.
Restored on `EventCard`'s "View event" link rather than on the heading, so the visible affordance and
its `sr-only` disambiguator survive. `Card` is already `relative`, so the pseudo-element stretches
over the card in both consumers (`events/page.tsx` and `event-carousel.tsx`).

### 9.7 The 37 orphans are deleted

Partition re-derived from scratch rather than read from §6: 37 files matched by nothing in `src/`,
`e2e/`, `media-manifest.json` or `docs/`, totalling **25,286,538 B**, in the same 7/7/7/7/7/1/1
grouping; the other 28 are all referenced. Deleted. `public/media/` is now 28 files, 7.0M — exactly
4 slots × 7 variants.

This also closed a licensing gap that had not been recorded: `docs/MEDIA-CREDITS.md` had dropped the
CC BY-SA lines for Tony Webster's `pages.slides` and Michael Barera's old `services.image` while all
14 of those files still shipped in `out/media/`. Both sets were in the deleted 37, so the credits
file and the shipped tree now agree.

### 9.8 Found, not fixed

- **Heading-level skips.** `out/services.html` goes h1 → h3×3 → h2; `out/team.html` h1 → h3×3;
  `out/learn.html` h1 → h3×7. `heading-order` is a best-practice rule, outside the tag filter the
  spec passes to axe, so the suite does not see it.
- **The vacuous photo test** in §9.3.
- **`docs/MEDIA-CREDITS.md` dropped its model/property-release paragraph**, which covered
  `events.image`. That file is generated from `media-manifest.json`; the remaining Usage restrictions
  section covers `pages.image` only.
- **`team-video.tsx`** remains unreachable, pre-existing at `5f6e3e1`.

### 9.9 Prose deleted

Rewriting `e2e/accessibility.spec.ts` dropped its header comment, which claimed the automated checks
"catch roughly a third of real issues — they are a floor, not a substitute for testing with an actual
screen reader before launch". The subject there is the application's future rather than the code, so
it is the prose this repository prohibits. Listed here so the deletion can be vetoed.

### 9.10 A second tier of unreferenced media, not acted on

Separate from the 37, and left in place because removing them edits the content model rather than
cleaning up after it. Thirteen files, **2,751,240 B**, appear in no built markup at all — measured by
extracting every `/media/…` path from `out/**/*.html`, `srcset` candidates included:

- **6 AVIF** (`articles.coverImage` and `services.image` at 480/900/1920), 1,570,577 B. The loader
  picks the smaller encoding per pair and WebP wins these.
- **All 7 variants of `pages.image`**, 1,180,663 B. The slot is declared in `src/content/media.ts`
  and `media-manifest.json`, and no content file consumes it — `articles.ts`, `events.ts` and
  `services.ts` each use their own. It is also the Pexels asset whose usage restrictions are the only
  entry left in `docs/MEDIA-CREDITS.md`.

Two figures reported during verification were wrong and are corrected here. "Zero AVIF is now
served" is false: `/media/eventsimage-…-{480,900,1920}.avif` are all in the built markup, so 3 of 12
slot×width pairs serve AVIF. And a count of 19 never-requested files counted one file per element;
counting every path present in markup gives 13, the difference being 3 events AVIF and 3 `.jpg`
originals that are referenced 11, 8 and 6 times.
