# SPEC_UI_REDESIGN_RESEARCH — research the reference corpus and write `SPEC_UI_REDESIGN.md`

## 1. Metadata

- Run mode: `code_update`
- Target repo: `/Users/mj/Repos/legacy-benefits-mn`
- Spec version: 1.0
- Date: 2026-09-23
- Repo `HEAD` when this spec was written: `70238a6fb4fedf672d7d1deddb8c57d037d0ffd0` on `main`
- Sole output artifact: `/Users/mj/Repos/legacy-benefits-mn/SPEC_UI_REDESIGN.md`

---

## 2. Goal & Definition of Done

### 2.1 Goal

This run produces one file: `SPEC_UI_REDESIGN.md` at the repo root. That file is a complete,
Technomancy-executable specification for a visual, motion and test overhaul of this site, derived
from the reference corpus in `docs/ui-reference/` and from live research performed during this run.
This run writes no application code, no CSS, no component and no test. A separate Technomancy session,
invoked by the owner, will execute `SPEC_UI_REDESIGN.md` afterwards.

### 2.2 Definition of Done

1. `SPEC_UI_REDESIGN.md` exists at `/Users/mj/Repos/legacy-benefits-mn/SPEC_UI_REDESIGN.md`.
2. `SPEC_UI_REDESIGN.md` contains all 14 canonical section headings listed in `§7.1`, in order,
   numbered 1 through 14, with the titles given there verbatim.
3. `SPEC_UI_REDESIGN.md` contains zero angle-bracket placeholders and zero occurrences of the literal
   string `TODO`.
4. Every repository path cited inside `SPEC_UI_REDESIGN.md` either resolves on disk or is marked in
   that file as retrievable with a `git show` command that is given verbatim on the same line.
5. `SPEC_UI_REDESIGN.md` cites no claim that `docs/ui-reference/VERIFICATION.md` marks `REJECTED`.
6. `SPEC_UI_REDESIGN.md` carries a capability-comparison table covering all seven capabilities listed
   in `§7.3`, each row naming the chosen technology, its exact version, and the alternatives rejected.
7. `SPEC_UI_REDESIGN.md` names a facelift obligation for each of the 15 route files found by
   `find "src/app/(site)" -name page.tsx`.
8. `SPEC_UI_REDESIGN.md` names a test obligation for each of the 8 files matching `e2e/*.spec.ts`.
9. `git status --porcelain` run at the end of this run differs from the baseline recorded in `§9.4`
   by exactly one added entry, `SPEC_UI_REDESIGN.md`, and by the contents of this run's directory
   under `technomancy_artifacts/`.
10. No file under `src/`, `e2e/`, `infra/`, `scripts/`, `docs/`, `public/`, or `.github/` is created,
    modified or deleted by this run.
11. Nothing is committed, staged or pushed by this run.

---

## 3. Scope

### 3.1 In Scope

1. Reading the reference corpus under `docs/ui-reference/`, including the four documents that exist
   only in the git index per `§5.1`.
2. Re-deriving the two reference sites' technology stacks from live evidence where the network permits
   it, per `§5.3`.
3. Researching current alternatives to each technology the reference sites use, per `§7.3`.
4. Planning the imagery, video, shader and frame-sequence assets the redesign needs, using the
   `media-planner` skill.
5. Deciding the aesthetic direction — palette, type scale, motion language, composition — using the
   `design-director` skill, under the measured constraints in `§4.6`.
6. Auditing the current UI surface of this repository so the produced spec is written against what is
   actually there.
7. Writing `SPEC_UI_REDESIGN.md`.
8. Recording, inside `SPEC_UI_REDESIGN.md`, every decision this run took on the owner's behalf.

### 3.2 Out of Scope

1. Writing, editing or deleting any file under `src/`. The redesign is specified here, not built.
2. Writing, editing or deleting any file under `e2e/`. Test changes are specified, not made.
3. Writing, editing or deleting any file under `infra/`, `scripts/`, `public/`, `.github/`, or `docs/`.
4. Editing `package.json` or `pnpm-lock.yaml`. Dependencies are named in the produced spec, not
   installed.
5. Running `pnpm install`, `pnpm build`, `next build`, or any package-manager install command.
6. Running `scripts/capture-reference-site.mjs` in write mode — it writes into `docs/ui-reference/`,
   which `§4.3` prohibits.
7. Committing, staging or pushing anything.
8. Introducing a CMS, a headless content service, or any runtime content source. Content authoring
   stays in the TypeScript modules under `src/content/`.
9. Downloading any third-party font, video, image or script byte into this repository. The corpus was
   built without doing so and this run must not change that.
10. Re-running the adversarial verification of the corpus. `docs/ui-reference/VERIFICATION.md` already
    exists and is consumed as given.
11. Executing `SPEC_UI_REDESIGN.md`. The owner invokes that separately.
12. Producing any second document. One output file, named in `§2.2` item 1.

---

## 4. Constraints & Environment

### 4.1 Stack & Versions

- Language / runtime: TypeScript 5 on Node.js — this run must record the exact output of
  `node --version` in `§4.1` of the produced spec rather than assuming a version.
- Framework: `next` 16.3.4, `react` 19.2.8, `react-dom` 19.2.8, all pinned in `package.json`.
- Rendering mode: static export. `next.config.ts` sets `output: "export"` and a custom image loader
  at `./src/lib/image-loader.ts` with `deviceSizes: [480, 900, 1920]` and `imageSizes: [256]`.
- Styling: `tailwindcss` 4 with `@tailwindcss/postcss`, tokens declared in `src/app/globals.css`.
- Motion library already installed: `motion` 13.2.0.
- Unit and integration tests: `vitest` 5.0.0, configured by `vitest.config.ts`.
- End-to-end tests: `@playwright/test` 1.61.1, configured by `playwright.config.ts`.
- Accessibility assertions: `@axe-core/playwright` 4.13.0.
- Package manager: `pnpm@10.8.1`, declared by the `packageManager` key in `package.json`.
- Hook runner: `lefthook` 2.1.14, configured by `lefthook.yml`; `pnpm check` runs `lefthook run verify-all`.

### 4.2 Allowed Paths

1. `SPEC_UI_REDESIGN.md` — created at the repo root by this run.
2. `technomancy_artifacts/SPEC_UI_REDESIGN_RESEARCH__*/**` — this run's own artifact directory.

### 4.3 Prohibited Paths

1. `src/**` — read only.
2. `e2e/**` — read only.
3. `infra/**` — read only.
4. `scripts/**` — read only.
5. `docs/**` — read only.
6. `public/**` — read only.
7. `.github/**` — read only.
8. `package.json` — read only.
9. `pnpm-lock.yaml` — read only.
10. `media-manifest.json` — read only.
11. `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`,
    `postcss.config.mjs`, `drizzle.config.ts`, `lefthook.yml` — read only.
12. `CLAUDE.md`, `AGENTS.md`, `README.md` — read only.
13. `technomancy_artifacts/SPEC_UI_UPDATE__20260918-221808/**` — read only; it is a prior run's log.
14. `SPEC_UI_REDESIGN_RESEARCH.md` — this file; read only during the run.

### 4.4 External Systems & APIs

1. `https://ethnocare.ca/` — the primary reference site. Read-only HTTP requests only.
2. `https://www.andrewrinehart.us/` — the secondary reference site. Read-only HTTP requests only.
3. `https://registry.npmjs.org/` — for current version numbers of candidate packages.
4. Web search and documentation lookup tools available to the run, for the capability research in
   `§6.3`.
5. `node_modules/next/dist/docs/` — the Next.js documentation shipped with the installed version; the
   authority for anything this run claims about Next.js 16 behaviour.

### 4.5 Environment Variables & Secrets

1. `NEXT_PUBLIC_MEDIA_HOST` — read by `next.config.ts` to build `images.remotePatterns`; the produced
   spec must state whether its media plan depends on this being set.
2. No other environment variable is read by this run. No credential, token or key is read, written or
   quoted anywhere in this run's output.

### 4.6 Performance / Security / Compliance Limits

1. Every foreground-text-on-background pair the produced spec specifies must measure at least `4.5:1`
   contrast, and the produced spec must state the measured ratio next to each pair.
2. Every large-text pair — 24px and above, or 18.66px and above at weight 700 — the produced spec
   specifies must measure at least `3:1`, with the measured ratio stated.
3. The body copy size floor is 16px. The produced spec must not specify a body text size below it.
4. No commercial webfont file may be re-hosted. `HelveticaNowDisplay` and `PPMonumentExtended-Bold`
   are licensed to `ethnocare.ca` and are recorded in `docs/ui-reference/ethnocare.ca/tech-stack.md`
   as `licensedThirdParty`. The produced spec must name open-licence substitutes instead.
5. No signed media URL may be referenced. The six Vimeo `progressive_redirect` URLs in
   `docs/ui-reference/ethnocare.ca/tech-stack.md` carry a `signature` query parameter and expire.
6. Every byte figure the produced spec states must carry either a source file or the words
   `estimate, by this method` followed by the method.
7. `pnpm` invocations fail in this environment with a registry-signature verification error. This run
   must not depend on running `pnpm`; version lookups go through the network tools or
   `node_modules/`.
8. `next build` does not complete in this environment. This run must not attempt a build.

### 4.7 Existing-Code Conventions to Follow

1. Design tokens are declared in the `@theme` block of `src/app/globals.css` and re-exported as
   semantic names in the `@theme inline` block at the end of that file. The produced spec must
   express palette and scale changes as edits to those two blocks.
2. Colour schemes are selected by the `data-scheme` attribute, with `light`, `muted` and `dark`
   variants defined in `src/app/globals.css`. The produced spec must keep that mechanism or state
   explicitly what replaces it and what happens to every current consumer.
3. Motion durations and easings exist twice — as CSS custom properties in `src/app/globals.css` and as
   exported constants in `src/lib/motion.ts`. The produced spec must state which file is authoritative
   after the redesign.
4. Page content is authored as TypeScript modules under `src/content/`, typed by
   `src/content/types.ts`. The produced spec must keep that authoring model.
5. Media assets are declared in `src/content/media.ts` against entries in `media-manifest.json`, and
   resolved at request time by `src/lib/image-loader.ts`. The produced spec must route every new image
   through that path.
6. Prettier formats this repository; `prettier-plugin-tailwindcss` orders class names. The produced
   spec must not specify a formatting convention that contradicts `.prettierrc.json`.
7. `CLAUDE.md` and `AGENTS.md` prohibit writing requirement prose, positioning claims, or
   justification comments into this repository. The produced spec must carry that prohibition forward
   to the implementation run, and must itself be a task document per `§10.4`.

---

## 5. Scenarios & Paths

### 5.1 Scenario SC-1 — Four corpus documents exist only in the git index

**Trigger / Preconditions:** `docs/ui-reference/VERIFICATION.md`, `docs/ui-reference/MANIFEST.md`,
`docs/ui-reference/DIRECTION.md` and `docs/ui-reference/MEDIA-PLAN.md` are staged as added and deleted
from the working tree. `git status --porcelain` reports `AD` for each. Reading them from disk fails.

**Must-have behavior:**

1. This run must retrieve each of the four with `git show ":docs/ui-reference/VERIFICATION.md"`,
   `git show ":docs/ui-reference/MANIFEST.md"`, `git show ":docs/ui-reference/DIRECTION.md"` and
   `git show ":docs/ui-reference/MEDIA-PLAN.md"`.
2. This run must not conclude that a document is absent because a `Read` of its path returned nothing.
3. This run must not restore any of the four to the working tree; `§4.3` makes `docs/**` read only.
4. Every citation of those four inside the produced spec must state the `git show` command that
   retrieves the cited file, on the same line as the citation.

**How we prove it works:** `grep -c 'git show ":docs/ui-reference/' SPEC_UI_REDESIGN.md` returns a
count of at least 4.

### 5.2 Scenario SC-2 — A corpus claim carries a `REJECTED` verdict

**Trigger / Preconditions:** `docs/ui-reference/VERIFICATION.md` §1 lists 43 numbered claims with
verdicts. 21 are `REJECTED`, 2 are `UNTRACEABLE`, 1 is `PLAUSIBLE`, the rest `CONFIRMED`.

**Must-have behavior:**

1. This run must read `docs/ui-reference/VERIFICATION.md` in full before reading any other corpus
   prose file.
2. This run must treat every claim marked `REJECTED` as uncitable, including the claims that the
   reduced-motion blank-sections finding is real, that the resolved palette column may be copied as
   one theme, that the 208px `PPMonumentExtended` row is the `display` role, and that
   `transitions/t*/session.webm` exists.
3. This run must treat the `UNTRACEABLE` and `PLAUSIBLE` claims as citable only with the verdict
   stated alongside them in the produced spec.
4. Where a `REJECTED` claim is contradicted by a replacement value stated in `VERIFICATION.md`, the
   produced spec must use the replacement value and cite `VERIFICATION.md` as its source.

**How we prove it works:** `grep -n 'REJECTED' SPEC_UI_REDESIGN.md` shows every occurrence inside an
explicit exclusion statement, and no design value in the produced spec traces to a rejected claim.

### 5.3 Scenario SC-3 — A live reference site cannot be reached

**Trigger / Preconditions:** Network egress is filtered in this environment. A request to
`https://ethnocare.ca/` or `https://www.andrewrinehart.us/` fails or is denied.

**Must-have behavior:**

1. This run must attempt the live re-derivation once per site using the `stack-detective` skill.
2. On failure, this run must fall back to `docs/ui-reference/ethnocare.ca/tech-stack.json` and
   `docs/ui-reference/andrewrinehart.us/tech-stack.json` and proceed.
3. This run must record the failure in `§12` of the produced spec, naming the URL and the error.
4. This run must not retry a denied request more than twice, and must not attempt to route around the
   network filter.

**How we prove it works:** the produced spec's `§12` contains one assumption per unreachable URL, or
its `§14.1` contains a live-verified note per reachable URL.

### 5.4 Scenario SC-4 — An upstream version has moved since the capture

**Trigger / Preconditions:** The corpus was captured on 2026-09-18 and records Lenis 1.0.29, GSAP
3.15.0, three.js r152, Swiper 11.x, Vue 3.5.38. A current lookup returns a different version.

**Must-have behavior:**

1. This run must look up the current published version of every package it proposes in the produced
   spec.
2. The produced spec must state the exact version it proposes, never a range and never `latest`.
3. The produced spec must state, per proposed package, whether it works under React 19.2.8 and under
   `output: "export"`, and must cite where that was checked.
4. Where the corpus version and the current version differ, the produced spec must state both and say
   which it specifies.

**How we prove it works:** every row of the produced spec's dependency table carries a version string
matching the pattern `[0-9]+\.[0-9]+\.[0-9]+` or an explicit revision identifier.

### 5.5 Scenario SC-5 — A reference asset is licence-encumbered

**Trigger / Preconditions:** The research wants a font, a video, an image or a script that the
reference sites serve under a licence issued to them.

**Must-have behavior:**

1. This run must not specify re-hosting `HelveticaNowDisplay` or `PPMonumentExtended-Bold`.
2. This run must specify open-licence substitutes for the display and text roles, naming the licence
   of each.
3. This run must not reference any Vimeo `progressive_redirect` URL from the corpus.
4. This run must invoke the `media-planner` skill to produce the asset plan, and the produced spec
   must carry one sourcing lane and one licence obligation per media slot.
5. The produced spec must state the delivery widths and formats for every image slot, consistent with
   `deviceSizes: [480, 900, 1920]` and `imageSizes: [256]` in `next.config.ts`.

**How we prove it works:** the produced spec contains a media table in which every row names a slot, a
sourcing lane, a licence, and a delivery width set.

### 5.6 Scenario SC-6 — Reduced motion

**Trigger / Preconditions:** A visitor has `prefers-reduced-motion: reduce` set. `playwright.config.ts`
defines a `reduced-motion` project that runs `e2e/motion.spec.ts` under that preference.

**Must-have behavior:**

1. The produced spec must state, for every motion effect it specifies, what renders under
   `prefers-reduced-motion: reduce`.
2. The produced spec must forbid any section becoming unreadable under that preference.
3. The produced spec must state what the WebGL background renders under that preference.
4. The produced spec must state what the scroll-scrubbed frame sequence renders under that preference.
5. The produced spec must preserve the reduced-motion obligations currently asserted by
   `e2e/motion.spec.ts`, or state explicitly which assertion changes and to what.

**How we prove it works:** the produced spec's testing section names `e2e/motion.spec.ts` and the
`reduced-motion` Playwright project by name, and states the pass condition for each.

### 5.7 Scenario SC-7 — No JavaScript, and print

**Trigger / Preconditions:** `e2e/motion.spec.ts` contains assertions titled
`content is visible with JavaScript disabled`, `nothing prints blank`, `item 2: renders zero canvases
with JavaScript disabled`, and `print: 13 of 13 sections render`.

**Must-have behavior:**

1. The produced spec must state, for every new effect, what renders with JavaScript disabled.
2. The produced spec must state, for every new effect, what renders under `@media print`.
3. The produced spec must state that no band may be blank in either condition.
4. The produced spec must state what happens to the print rules currently in `src/app/globals.css`.

**How we prove it works:** the produced spec's scenario section contains a no-JavaScript scenario and
a print scenario, each with its own stated proof.

### 5.8 Scenario SC-8 — Static export has no server at runtime

**Trigger / Preconditions:** `next.config.ts` sets `output: "export"`. `playwright.config.ts` notes
that `next start` cannot serve such a build and runs `node scripts/serve-e2e.mjs` instead.

**Must-have behavior:**

1. The produced spec must not specify any feature requiring a Node.js runtime on the request path.
2. The produced spec must not specify `next/image` optimisation beyond what
   `src/lib/image-loader.ts` and `media-manifest.json` already provide.
3. The produced spec must state, per proposed dependency, whether it runs client-side only.
4. The produced spec must state how the e2e suite serves the redesigned site, naming
   `scripts/serve-e2e.mjs` and port `3100` from `playwright.config.ts`.

**How we prove it works:** the produced spec's constraints section quotes `output: "export"` and names
`scripts/serve-e2e.mjs`.

### 5.9 Scenario SC-9 — The prior direction contradicts the owner's instruction

**Trigger / Preconditions:** `docs/ui-reference/DIRECTION.md`, retrievable with
`git show ":docs/ui-reference/DIRECTION.md"`, states a thesis that refuses the reference look,
including the sentence that what does not transfer is Lenis and Locomotive's hijacked scroll. The
owner has since instructed the opposite.

**Must-have behavior:**

1. This run must treat the owner's instruction, recorded in `§12` items A-1 through A-5, as
   outranking `DIRECTION.md`'s aesthetic thesis.
2. This run must continue to treat `DIRECTION.md`'s measured data as citable — its 25 contrast ratios,
   its font metrics and its 12 dead-token list, all of which `VERIFICATION.md` claims 36, 37 and 38
   mark `CONFIRMED`.
3. The produced spec must state, in its own `§12`, that `DIRECTION.md`'s thesis is superseded and its
   measurements are retained.
4. This run must not edit or delete `DIRECTION.md`; `§4.3` makes `docs/**` read only.

**How we prove it works:** the produced spec's `§12` contains an entry naming `DIRECTION.md` and
stating both halves of the ruling.

### 5.10 Scenario SC-10 — A capability has a better current answer than the reference site's

**Trigger / Preconditions:** The research compares a capability in `§7.3` and finds an option the
reference sites do not use.

**Must-have behavior:**

1. This run must evaluate each of the seven capabilities in `§7.3` on its own, never adopting the
   reference stack wholesale.
2. This run must record the rejected alternatives per capability, not only the winner.
3. This run must state, per capability, the one thing the winner does that the runners-up do not.
4. Where the reference site's choice wins, the produced spec must say why it won rather than leaving
   the reader to infer it was copied.
5. This run must state the gzipped transfer size of every technology it proposes, with the method by
   which that size was obtained.

**How we prove it works:** the produced spec contains a table with exactly seven capability rows, each
carrying a chosen technology, a version, a size, and a rejected-alternatives cell.

### 5.11 Scenario SC-11 — A fresh run versus a resumed run

**Trigger / Preconditions:** `SPEC_UI_REDESIGN.md` already exists at the repo root when this run
starts, because a previous attempt of this spec wrote one.

**Must-have behavior:**

1. This run must detect the existing file before writing.
2. This run must overwrite it in full rather than appending to it or merging into it.
3. This run must record in its `run_summary.md` that a previous version existed and was replaced,
   naming its byte count.
4. This run must not create a numbered variant such as a file with a `-2` suffix.

**How we prove it works:** after the run, `ls SPEC_UI_REDESIGN*.md` lists exactly one file.

### 5.12 Scenario SC-12 — The produced spec fails its own self-audit

**Trigger / Preconditions:** One of the mechanical checks in `§9.2` fails against the written
`SPEC_UI_REDESIGN.md`.

**Must-have behavior:**

1. This run must run every check in `§9.2` against the file after writing it, reading the file back
   from disk rather than auditing from memory.
2. This run must repair the file and re-run every check until all pass.
3. This run must not report completion while any check in `§9.2` fails.
4. This run must record the final check output verbatim in its `run_summary.md`.

**How we prove it works:** `run_summary.md` in this run's artifact directory contains the verbatim
output of each command in `§9.2`, with the passing value shown.

---

## 6. Functional Requirements

### 6.1 Corpus reading

1. FR-1 — This run must read `docs/ui-reference/VERIFICATION.md`, retrieved per `§5.1`, in full before
   reading any other prose file in the corpus.
2. FR-2 — This run must read `docs/ui-reference/MANIFEST.md`, retrieved per `§5.1`, in full.
3. FR-3 — This run must read `docs/ui-reference/DIRECTION.md`, retrieved per `§5.1`, in full.
4. FR-4 — This run must read `docs/ui-reference/MEDIA-PLAN.md`, retrieved per `§5.1`, in full.
5. FR-5 — This run must read `docs/ui-reference/ethnocare.ca/notes.md` in full.
6. FR-6 — This run must read `docs/ui-reference/ethnocare.ca/tech-stack.md` in full.
7. FR-7 — This run must read `docs/ui-reference/andrewrinehart.us/notes.md` in full.
8. FR-8 — This run must read `docs/ui-reference/andrewrinehart.us/tech-stack.md` in full.
9. FR-9 — This run must read `docs/ui-reference/ethnocare.ca/effects/effects.json` and record the
   `imageSequence` and `webglGradient` entries it uses.
10. FR-10 — This run must read `docs/ui-reference/ethnocare.ca/motion/scroll-linked.json` and must not
    specify a parallax ratio derived from its fitted slopes, because every fit has an r² below 0.72.
11. FR-11 — This run must read `docs/ui-reference/ethnocare.ca/motion/reveals-observed.json` and state
    the reveal threshold it adopts, with the verdict `VERIFICATION.md` gives that measurement.
12. FR-12 — This run must open at least four image artifacts from the corpus and describe what is in
    them, naming each file it opened.
13. FR-13 — This run must treat `docs/ui-reference/index.json` as carrying one broken path — it cites
    `docs/ui-reference/www.andrewrinehart.us/index.json`, while the directory on disk is
    `docs/ui-reference/andrewrinehart.us` — and must not report that site's artifacts as missing.
14. FR-14 — This run must not cite
    `docs/ui-reference/andrewrinehart.us/effects/SYNTHETIC-particles-never-renders-on-site-t600ms.png`
    or its `t2400ms` counterpart as a picture of the Rinehart site.

### 6.2 Current-repository audit

15. FR-15 — This run must enumerate every route by running `find "src/app/(site)" -name page.tsx` and
    must state the resulting count in the produced spec.
16. FR-16 — This run must read `src/app/globals.css` in full and list every token the produced spec
    changes, adds or deletes.
17. FR-17 — This run must read every file under `src/components/motion/` and state, per file, whether
    the produced spec keeps, rewrites or deletes it.
18. FR-18 — This run must read every file under `src/components/sections/` and state, per file,
    whether the produced spec keeps, rewrites or deletes it.
19. FR-19 — This run must read `src/lib/motion.ts` and state what happens to each of its nine exported
    constants.
20. FR-20 — This run must read every file matching `e2e/*.spec.ts` and state, per file, which
    assertions the redesign breaks and what replaces them.
21. FR-21 — This run must preserve the `data-*` attribute vocabulary the e2e suite selects on, or name
    each replacement explicitly. The attributes currently selected on are `data-site-header`,
    `data-hero-motion`, `data-compliance`, `data-reveal`, `data-particle-field`, `data-nav-sheet`,
    `data-band`, `data-morph`, `data-lit-words`, `data-curtain`, `data-card`, `data-hero-parallax`,
    `data-hero-frame`, `data-article-type` and `data-active`.
22. FR-22 — This run must read `src/content/types.ts` and state whether the redesign changes any
    content type, and if so, which field.
23. FR-23 — This run must read `media-manifest.json` and `src/content/media.ts` and state how new
    media slots enter them.
24. FR-24 — This run must read `CLAUDE.md` and `AGENTS.md` and carry their prohibitions into the
    produced spec's constraints section.

### 6.3 Technology research

25. FR-25 — This run must evaluate each of the seven capabilities listed in `§7.3` independently.
26. FR-26 — This run must perform at least one current-information lookup per capability.
27. FR-27 — This run must invoke the `stack-detective` skill once per reference site to re-derive its
    stack from live evidence, subject to `§5.3`.
28. FR-28 — This run must record, per capability, the chosen technology, its exact version, its
    gzipped transfer size, the method by which that size was obtained, and the alternatives rejected.
29. FR-29 — This run must verify each proposed package against React 19.2.8 and `output: "export"`,
    citing `node_modules/next/dist/docs/` for any claim about Next.js 16 behaviour.
30. FR-30 — This run must state the total added JavaScript weight, gzipped, that the produced spec's
    dependency set implies, and the arithmetic that produced the total.
31. FR-31 — This run must state, for every proposed dependency, what breaks if it is not added.
32. FR-32 — This run must not propose a dependency whose sole justification is that a reference site
    uses it.

### 6.4 Design direction

33. FR-33 — This run must invoke the `design-director` skill to produce the aesthetic direction.
34. FR-34 — The direction must state a palette in which every specified text-on-background pair
    carries its measured contrast ratio, meeting the thresholds in `§4.6` items 1 and 2.
35. FR-35 — The direction must state a type scale naming an open-licence display face and an
    open-licence text face, with the licence of each.
36. FR-36 — The direction must state a motion language: the durations and easing curves the redesign
    uses, and which of them are new versus already present in `src/app/globals.css`.
37. FR-37 — The direction must state a composition system: the grid, the gutter, the page margin and
    the band rhythm, each as a number with a unit.
38. FR-38 — The direction must state what is deliberately not taken from either reference site, item
    by item.
39. FR-39 — The direction must specify the WebGL shader background: where it appears, what its
    uniforms are, what it renders on a device with no WebGL context, and what it renders under reduced
    motion.
40. FR-40 — The direction must specify the linked-node particle field: where it appears, its particle
    count at device pixel ratio 1, its link distance, its speed, and its reduced-motion behaviour. The
    authored source configuration is recorded in
    `docs/ui-reference/andrewrinehart.us/effects/particles.config.json` under `source.authoredConfig`,
    and the produced spec must use that rather than the `probe` values, which are doubled by
    `retina_detect`.
41. FR-41 — The direction must specify the scroll-scrubbed frame sequence: which route it appears on,
    its frame count, its per-frame and total byte cost with the arithmetic shown, its loading strategy,
    its mobile behaviour, and its reduced-motion behaviour.
42. FR-42 — The direction must state the page geometry it specifies per route — the scroll height each
    redesigned route implies — and must state it as a number.

### 6.5 Media planning

43. FR-43 — This run must invoke the `media-planner` skill.
44. FR-44 — The media plan must list one slot per route section that needs imagery, tied to the route
    file and the component that renders it.
45. FR-45 — The media plan must state one sourcing lane per slot.
46. FR-46 — The media plan must state the licence obligation per slot and what shipping it requires,
    such as an attribution line.
47. FR-47 — The media plan must state the delivery widths and formats per slot.
48. FR-48 — The media plan must state a total weight budget with the arithmetic that produced it.
49. FR-49 — The media plan must state whether any slot is a video, and if so, its byte cost and its
    poster-frame behaviour.

### 6.6 Writing the produced spec

50. FR-50 — This run must write `SPEC_UI_REDESIGN.md` to `/Users/mj/Repos/legacy-benefits-mn/`.
51. FR-51 — `SPEC_UI_REDESIGN.md` must carry all 14 headings from `§7.1`, in order, with those titles
    verbatim.
52. FR-52 — `SPEC_UI_REDESIGN.md` must declare its run mode as `code_update` in its own `§1`.
53. FR-53 — `SPEC_UI_REDESIGN.md` must state its own allowed paths and prohibited paths in its `§4`.
54. FR-54 — `SPEC_UI_REDESIGN.md` must carry one numbered functional requirement per obligation, one
    obligation per line, each written with `must`.
55. FR-55 — `SPEC_UI_REDESIGN.md` must carry an acceptance-criteria table in its `§11`, every row
    binary and every row naming a scenario defined in its `§5`.
56. FR-56 — `SPEC_UI_REDESIGN.md` must carry a scenario for each of: reduced motion, no JavaScript,
    print, mobile viewport, no WebGL context, static export, and a first visit versus a repeat visit.
57. FR-57 — `SPEC_UI_REDESIGN.md` must name the exact commands that verify it, including
    `pnpm test:e2e`, `pnpm test`, `pnpm lint` and `pnpm exec tsc --noEmit`.
58. FR-58 — `SPEC_UI_REDESIGN.md` must record in its `§12` every decision this run took on the owner's
    behalf.
59. FR-59 — `SPEC_UI_REDESIGN.md` must state that it is a task document, is not to be committed, and
    is to be deleted when the implementation run lands.
60. FR-60 — `SPEC_UI_REDESIGN.md` must contain zero angle-bracket placeholders and zero occurrences of
    `TODO`.
61. FR-61 — `SPEC_UI_REDESIGN.md` must contain an even number of three-backtick fence markers.
62. FR-62 — This run must not write any file other than `SPEC_UI_REDESIGN.md` and its own artifacts
    under `technomancy_artifacts/`.

---

## 7. Data & Interfaces

### 7.1 The produced spec's required section headings

The produced `SPEC_UI_REDESIGN.md` must carry these 14 H2 headings, in this order, with these titles:

1. `## 1. Metadata`
2. `## 2. Goal & Definition of Done`
3. `## 3. Scope`
4. `## 4. Constraints & Environment`
5. `## 5. Scenarios & Paths`
6. `## 6. Functional Requirements`
7. `## 7. Data & Interfaces`
8. `## 8. File & Module Layout`
9. `## 9. Testing Requirements`
10. `## 10. Non-Functional Requirements`
11. `## 11. Acceptance Criteria`
12. `## 12. Assumptions`
13. `## 13. Open Questions`
14. `## 14. Reference Material`

### 7.2 Dependency record shape

Every dependency the produced spec proposes must appear as one row carrying these six cells:

<!-- prettier-ignore -->
| Package | Version | Gzipped size | Size method | Capability | What breaks without it |
| --- | --- | --- | --- | --- | --- |

### 7.3 Capability comparison table shape

The produced spec must carry exactly these seven capability rows, each with a chosen technology, its
version, and the alternatives rejected:

<!-- prettier-ignore -->
| Capability | Reference-site answer | Alternatives that must be evaluated |
| --- | --- | --- |
| Smooth or normalised scroll | Lenis 1.0.29 in native-scroll mode | current Lenis, CSS `scroll-behavior`, no smoothing at all |
| Scroll-linked reveal and progress | Locomotive Scroll v5 | CSS scroll-driven animations via `animation-timeline`, `scroll()` and `view()`; `IntersectionObserver`; the scroll APIs in the installed `motion` 13.2.0 |
| Tweening | GSAP 3.15.0 with ScrollTrigger | current GSAP, the installed `motion` 13.2.0, the Web Animations API, CSS `@keyframes` |
| WebGL background | three.js r152 with `EffectComposer` | current three.js, OGL, raw WebGL2, WebGPU with a fallback, a CSS or 2D-canvas substitute |
| Scroll-scrubbed frame sequence | 2006 WebP frames on a bisection loader | AVIF frames, a seeked `<video>` element, a procedural shader substitute |
| Page transitions | modularjs history takeover | the View Transitions API already wired in `src/app/globals.css` |
| Type splitting | GSAP SplitText | current SplitText, `Intl.Segmenter`, a CSS-only treatment |

### 7.4 Route coverage record shape

The produced spec must carry one row per route file, with these cells:

<!-- prettier-ignore -->
| Route file | Current sections | Facelift obligation | Scenario |
| --- | --- | --- | --- |

The 15 route files are those returned by `find "src/app/(site)" -name page.tsx`.

### 7.5 Test coverage record shape

The produced spec must carry one row per e2e spec file, with these cells:

<!-- prettier-ignore -->
| Test file | Assertions the redesign breaks | Replacement assertion | Command that runs it |
| --- | --- | --- | --- |

The 8 files are those matching `e2e/*.spec.ts`: `accessibility.spec.ts`, `compliance.spec.ts`,
`lead-form.spec.ts`, `motion.spec.ts`, `navigation.spec.ts`, `structure.spec.ts`,
`typography.spec.ts`, `zoom.spec.ts`.

### 7.6 Contracts quoted verbatim

1. The shader uniform list recorded for the reference site's animated background, from
   `docs/ui-reference/ethnocare.ca/notes.md`, is:

   ```text
   uTime, uResolution, uPosition, uAccentColor, uBackgroundColor, uZoom, uTimeAmplitude
   ```

2. The reference site's published breakpoint ladder, from `window.config.BREAKPOINTS` as recorded in
   `docs/ui-reference/ethnocare.ca/notes.md`, is:

   ```text
   TINY 500 · SMALL 700 · MEDIUM 1000 · LARGE 1200 · BIG 1400 · HUGE 1600 · ENORMOUS 1800 · GIGANTIC 2000 · COLOSSAL 2400
   ```

3. The static-export declaration this repository runs under, from `next.config.ts`, is:

   ```ts
   output: "export",
   ```

4. The handoff line the run must print when finished is:

   ```text
   Use Technomancy to implement @SPEC_UI_REDESIGN.md
   ```

---

## 8. File & Module Layout

```text
/Users/mj/Repos/legacy-benefits-mn/
  SPEC_UI_REDESIGN.md                        the sole output of this run
  technomancy_artifacts/
    SPEC_UI_REDESIGN_RESEARCH__TIMESTAMP/
      SPEC_FULL.md                           copy of this spec, written by the skill
      project_plan.md                        ArchTechnomancer output
      delegation_matrix.md                   ArchTechnomancer output
      high_technomancer_chat.md              append-only
      high_technomancer_HTM-N_conclave_plan.md   one per HTM assignment
      technomancer_chat_HTM-N.md             append-only, one per HTM assignment
      evidence_corpus_verdicts.md            the REJECTED list this run honoured
      evidence_capability_research.md        per-capability lookups and their sources
      evidence_media_plan.md                 the media-planner output
      evidence_direction.md                  the design-director output
      run_summary.md                         includes the verbatim §9.2 check output
```

No path outside this tree may be created or modified by this run.

---

## 9. Testing Requirements

### 9.1 Frameworks

- No test framework runs in this run. This run writes Markdown, not code.
- Verification is performed by the shell commands in `§9.2`, run from the repo root.

### 9.2 What Must Be Covered

1. Section headings, proving `§2.2` item 2 and SC-12:
   `grep -c '^## ' SPEC_UI_REDESIGN.md` must return `14`.
2. Heading order, proving `§2.2` item 2: `grep -n '^## ' SPEC_UI_REDESIGN.md` must list the 14 titles
   of `§7.1` in order.
3. Placeholders, proving `§2.2` item 3 and FR-60:
   `grep -c 'TODO' SPEC_UI_REDESIGN.md` must return `0`.
4. Fence parity, proving FR-61: the number of three-backtick fence markers in `SPEC_UI_REDESIGN.md`
   must be even, counted with `grep -o $'\x60\x60\x60' SPEC_UI_REDESIGN.md | wc -l`.
5. Corpus retrieval, proving SC-1: `grep -c 'git show ":docs/ui-reference/' SPEC_UI_REDESIGN.md` must
   return at least `4`.
6. Route coverage, proving `§2.2` item 7 and FR-15: every path returned by
   `find "src/app/(site)" -name page.tsx` must appear at least once in `SPEC_UI_REDESIGN.md`.
7. Test coverage, proving `§2.2` item 8 and FR-20: each of the 8 filenames listed in `§7.5` must
   appear at least once in `SPEC_UI_REDESIGN.md`.
8. Capability coverage, proving SC-10 and FR-25: each of the seven capability names in `§7.3` must
   appear at least once in `SPEC_UI_REDESIGN.md`.
9. Path resolution, proving `§2.2` item 4: every repository-relative path cited in
   `SPEC_UI_REDESIGN.md` must resolve with `test -e`, or carry a `git show` command on the same line.
10. Scope containment, proving `§2.2` item 10: `git status --porcelain` must show no entry under
    `src/`, `e2e/`, `infra/`, `scripts/`, `docs/`, `public/` or `.github/` that is absent from the
    `§9.4` baseline.
11. Single output, proving SC-11: `ls SPEC_UI_REDESIGN*.md` must list exactly one file.
12. Cleanliness, proving `§2.2` item 11: `git log --oneline -1` must return
    `70238a6fb4fedf672d7d1deddb8c57d037d0ffd0` shortened, unchanged from the start of the run.

### 9.3 How to Run

- Command: `grep -c '^## ' SPEC_UI_REDESIGN.md && grep -c 'TODO' SPEC_UI_REDESIGN.md && ls SPEC_UI_REDESIGN*.md`
- Working directory: `/Users/mj/Repos/legacy-benefits-mn`
- Pass condition: the first command prints `14`, the second prints `0`, the third prints exactly one
  filename, and every remaining check in `§9.2` passes when run individually.

### 9.4 Baseline

1. This run must capture `git status --porcelain` before writing anything and store it in its artifact
   directory as the baseline that `§9.2` item 10 differences against.
2. This run must record the baseline entry count in `run_summary.md`.
3. The working tree was already dirty when this spec was written; `§9.2` item 10 is a delta check, not
   a clean-tree check.

---

## 10. Non-Functional Requirements

### 10.1 Performance

1. This run must perform at most two live HTTP fetches per reference site.
2. This run must not read every file in `docs/ui-reference/`; it must select files through the index
   files and the prose documents. The corpus is 906 files and 328 MB, measured by
   `find docs/ui-reference -type f | wc -l` and `du -sh docs/ui-reference`.
3. This run must not open `docs/ui-reference/ethnocare.ca/network/desktop.har`, which is 16 MB, unless
   a specific claim cannot be settled without it.

### 10.2 Security

1. This run must not write any credential, token, key, ARN or account identifier into any file.
2. This run must not fabricate a version number, a byte count, a price or a contrast ratio. Every such
   value must carry its source.
3. This run must not download any third-party binary asset into this repository.

### 10.3 Reliability

1. This run must not report an obligation as satisfied on the basis of a zero exit code alone; it must
   quote the output that settles it.
2. This run must re-read `SPEC_UI_REDESIGN.md` from disk before auditing it.
3. This run must repeat the `§9.2` checks after every repair until all pass.

### 10.4 Compliance & Other Limits

1. `SPEC_UI_REDESIGN.md` is a task document under the rule in `AGENTS.md`: it names its task in its
   filename, stays untracked, and is deleted when the implementation work lands. The produced spec
   must say so in its own text.
2. `SPEC_UI_REDESIGN_RESEARCH.md` — this file — is subject to the same rule and is deleted when this
   run lands.
3. The produced spec must forbid the implementation run from writing requirement prose, positioning
   claims or justification comments into the repository, per `CLAUDE.md` and `AGENTS.md`.
4. The produced spec must forbid the implementation run from committing, staging or pushing.

---

## 11. Acceptance Criteria

<!-- prettier-ignore -->
| AC ID | Criterion (binary pass/fail) | Scenario (SC-*) |
| --- | --- | --- |
| AC-1 | `SPEC_UI_REDESIGN.md` exists at the repo root | SC-11 |
| AC-2 | `grep -c '^## ' SPEC_UI_REDESIGN.md` returns `14` | SC-12 |
| AC-3 | The 14 headings appear in the order given in `§7.1` with those titles verbatim | SC-12 |
| AC-4 | `grep -c 'TODO' SPEC_UI_REDESIGN.md` returns `0` | SC-12 |
| AC-5 | `SPEC_UI_REDESIGN.md` contains zero angle-bracket placeholders | SC-12 |
| AC-6 | The count of three-backtick fence lines in `SPEC_UI_REDESIGN.md` is even | SC-12 |
| AC-7 | `grep -c 'git show ":docs/ui-reference/' SPEC_UI_REDESIGN.md` returns at least `4` | SC-1 |
| AC-8 | No claim on the `REJECTED` list of `docs/ui-reference/VERIFICATION.md` is used as a design input | SC-2 |
| AC-9 | The reduced-motion blank-sections finding appears only as an explicit exclusion, if at all | SC-2 |
| AC-10 | Each of the 15 route files from `find "src/app/(site)" -name page.tsx` appears in `SPEC_UI_REDESIGN.md` | SC-7 |
| AC-11 | Each of the 8 filenames listed in `§7.5` appears in `SPEC_UI_REDESIGN.md` | SC-6 |
| AC-12 | The capability table in `SPEC_UI_REDESIGN.md` has exactly seven rows, one per row of `§7.3` | SC-10 |
| AC-13 | Every capability row names at least one rejected alternative | SC-10 |
| AC-14 | Every dependency row carries a version matching `[0-9]+\.[0-9]+\.[0-9]+` or an explicit revision identifier | SC-4 |
| AC-15 | Every dependency row carries a gzipped size and the method that produced it | SC-10 |
| AC-16 | Every dependency row states what breaks without that dependency | SC-10 |
| AC-17 | `SPEC_UI_REDESIGN.md` states a total added gzipped JavaScript weight with its arithmetic | SC-10 |
| AC-18 | Every proposed dependency carries a stated React 19.2.8 and `output: "export"` verdict | SC-8 |
| AC-19 | Every text-on-background pair in the palette carries a measured contrast ratio | SC-12 |
| AC-20 | Every stated contrast ratio for body text is at least `4.5:1` | SC-12 |
| AC-21 | The specified body copy size floor is at least 16px | SC-12 |
| AC-22 | The type scale names an open-licence display face and an open-licence text face, with licences | SC-5 |
| AC-23 | `HelveticaNowDisplay` and `PPMonumentExtended-Bold` appear only as faces that must not be re-hosted | SC-5 |
| AC-24 | No Vimeo `progressive_redirect` URL appears in `SPEC_UI_REDESIGN.md` as an asset to use | SC-5 |
| AC-25 | The media table carries a slot, a sourcing lane, a licence and delivery widths per row | SC-5 |
| AC-26 | The media plan states a total weight budget with its arithmetic | SC-5 |
| AC-27 | The WebGL background specification states its no-WebGL fallback | SC-7 |
| AC-28 | The WebGL background specification states its reduced-motion behaviour | SC-6 |
| AC-29 | The particle-field specification uses the `source.authoredConfig` values, not the `probe` values | SC-2 |
| AC-30 | The frame-sequence specification states a frame count and a total byte cost with arithmetic | SC-10 |
| AC-31 | The frame-sequence specification states its mobile and reduced-motion behaviour | SC-6 |
| AC-32 | `SPEC_UI_REDESIGN.md` carries a scenario for reduced motion | SC-6 |
| AC-33 | `SPEC_UI_REDESIGN.md` carries a scenario for no JavaScript | SC-7 |
| AC-34 | `SPEC_UI_REDESIGN.md` carries a scenario for print | SC-7 |
| AC-35 | `SPEC_UI_REDESIGN.md` carries a scenario for the static export constraint | SC-8 |
| AC-36 | `SPEC_UI_REDESIGN.md` names `scripts/serve-e2e.mjs` and port `3100` | SC-8 |
| AC-37 | `SPEC_UI_REDESIGN.md` preserves or explicitly replaces each of the 15 `data-*` attributes in FR-21 | SC-6 |
| AC-38 | `SPEC_UI_REDESIGN.md` `§12` states that `DIRECTION.md`'s thesis is superseded and its measurements retained | SC-9 |
| AC-39 | `SPEC_UI_REDESIGN.md` states it is a task document, untracked, deleted when the work lands | SC-11 |
| AC-40 | `ls SPEC_UI_REDESIGN*.md` lists exactly one file | SC-11 |
| AC-41 | `git status --porcelain` shows no new entry under `src/`, `e2e/`, `infra/`, `scripts/`, `docs/`, `public/` or `.github/` | SC-12 |
| AC-42 | `git log --oneline -1` is unchanged from the start of the run | SC-12 |
| AC-43 | `run_summary.md` contains the verbatim output of every `§9.2` check | SC-12 |
| AC-44 | Every live-fetch failure is recorded in `SPEC_UI_REDESIGN.md` `§12` naming the URL and the error | SC-3 |
| AC-45 | Every corpus version that differs from the current published version is stated with both values | SC-4 |

---

## 12. Assumptions

1. A-1 — The owner instructed that the reference site's look is the target at roughly 80% weight and
   the secondary site's animated background at roughly 20%. This run treats that as the brief and does
   not re-open it.
2. A-2 — The owner instructed that the palette is the research's decision, bounded by the contrast and
   legibility limits in `§4.6`. This run decides it rather than asking.
3. A-3 — The owner explicitly authorised adding dependencies, which crosses the `CLAUDE.md` rule
   "Never add a service, resource or dependency unless explicitly asked". The authorisation is
   recorded here so no downstream tier re-litigates it. The owner further instructed that the
   reference site's stack is a floor rather than a target, so `§7.3` requires a comparison per
   capability rather than adoption of that stack.
4. A-4 — The owner instructed that both the WebGL shader gradient and the linked-node particle field
   are wanted. Both are specified; neither is treated as optional.
5. A-5 — The owner instructed that the scroll-scrubbed frame sequence is wanted without a byte budget,
   with its cost reported. `§6.4` FR-41 therefore requires the cost stated, not capped.
6. A-6 — The facelift covers all 15 routes. The owner said the pages should be facelifted, without
   naming a subset.
7. A-7 — Content authoring stays in `src/content/`. The owner said "without a CMS", and that is the
   current model.
8. A-8 — `docs/ui-reference/DIRECTION.md`'s aesthetic thesis is superseded by A-1 through A-5. Its
   measured data remains citable per SC-9.
9. A-9 — The four corpus documents named in SC-1 are consumed from the git index rather than restored
   to the working tree, because `§4.3` makes `docs/**` read only and restoring them would be a change
   nobody asked for.
10. A-10 — The reduced-motion blank-sections finding is treated as false, per
    `docs/ui-reference/VERIFICATION.md` claim 1.
11. A-11 — The secondary reference site's background is a looping video, and its particle library
    never initialises, per `docs/ui-reference/VERIFICATION.md` claim 25. The particle field this run
    specifies is therefore a new build from the authored configuration, not a copy of anything
    rendering on that site.
12. A-12 — `docs/ui-reference/index.json` cites `docs/ui-reference/www.andrewrinehart.us/index.json`,
    which does not exist; the directory is `docs/ui-reference/andrewrinehart.us`. This run treats that
    as a stale path in the index, not as missing artifacts.
13. A-13 — Node.js version is not pinned in `.mise.toml`, which pins only `terraform`, `tflint` and
    `trivy`. This run records the observed `node --version` rather than assuming one.
14. A-14 — The working tree is dirty at the start of this run. Every scope check is a delta against
    the `§9.4` baseline, never a clean-tree check.
15. A-15 — The prior run directory `technomancy_artifacts/SPEC_UI_UPDATE__20260918-221808/` is read for
    context only. Nothing in it constrains this run except where this spec cites it.
16. A-16 — `pnpm` cannot run in this environment, so no dependency is installed and no size is measured
    by installing. Sizes come from published package metadata, with the method stated per FR-28.

---

## 13. Open Questions

1. OQ-1 — Whether the redesigned site keeps three colour schemes (`light`, `muted`, `dark`) or reduces
   to two. The produced spec decides; the owner may revise it before the implementation run.
2. OQ-2 — Whether the frame sequence appears on more than one route. The produced spec specifies one
   route; extending it is a later revision.
3. OQ-3 — Whether an analytics or consent posture changes as part of the redesign. Not in scope here.
4. OQ-4 — Whether the redesign changes the announcement bar behaviour in
   `src/components/layout/announcement-bar.tsx`. The produced spec states a verdict; the owner may
   revise it.
5. OQ-5 — Whether the owner wants the reference corpus re-captured after the redesign ships, to
   compare the result against the references. Not in scope here.

---

## 14. Reference Material

### 14.1 Corpus files, grouped by the question each answers

**Read first — the verdicts that gate every other file:**

- `docs/ui-reference/VERIFICATION.md` — retrieve with `git show ":docs/ui-reference/VERIFICATION.md"`.
  43 numbered claims with verdicts; 21 `REJECTED`. Gates `§5.2`, FR-1, AC-8, AC-9.

**What the corpus contains and how it was made:**

- `docs/ui-reference/MANIFEST.md` — retrieve with `git show ":docs/ui-reference/MANIFEST.md"`.
- `docs/ui-reference/index.json` — the two-site roll-up; carries the stale path recorded in A-12.
- `docs/ui-reference/ethnocare.ca/index.json` — per-artifact index for the primary site.
- `docs/ui-reference/andrewrinehart.us/index.json` — per-artifact index for the secondary site.

**Palette, spacing, type and breakpoints:**

- `docs/ui-reference/ethnocare.ca/notes.md` — sections "Design tokens", "Type", "Breakpoints".
- `docs/ui-reference/ethnocare.ca/design-system.json` — declared and resolved custom properties.
- `docs/ui-reference/DIRECTION.md` — retrieve with `git show ":docs/ui-reference/DIRECTION.md"`.
  Contrast ratios and font metrics, citable per SC-9; thesis superseded per A-8.

**Motion, easing and reveals:**

- `docs/ui-reference/ethnocare.ca/notes.md` — section "Motion"; the easing and duration census.
- `docs/ui-reference/ethnocare.ca/motion/reveals-observed.json` — reveal thresholds.
- `docs/ui-reference/ethnocare.ca/motion/scroll-linked.json` — the parallax fits; see FR-10.

**The signature effects:**

- `docs/ui-reference/ethnocare.ca/effects/effects.json` — `imageSequence` and `webglGradient` entries.
- `docs/ui-reference/ethnocare.ca/effects/webgl-gradient.png` — a frame of the shader background.
- `docs/ui-reference/ethnocare.ca/effects/image-sequence-0.png` — a frame of the first scrubbed canvas.
- `docs/ui-reference/andrewrinehart.us/effects/particles.config.json` — the authored particle
  configuration; see FR-40.

**Technology and versions:**

- `docs/ui-reference/ethnocare.ca/tech-stack.md` — the primary site's stack, claim by claim.
- `docs/ui-reference/ethnocare.ca/tech-stack.json` — the machine-readable form.
- `docs/ui-reference/andrewrinehart.us/tech-stack.md` — the secondary site's stack.
- `docs/ui-reference/andrewrinehart.us/tech-stack.json` — the machine-readable form.

**Page geometry and composition:**

- `docs/ui-reference/ethnocare.ca/routes/home/extract.desktop.native.json` — `geometry.scrollHeight`
  and `domOutline`.
- `docs/ui-reference/ethnocare.ca/scroll/` — scroll-frame sequences per route and viewport.
- `docs/ui-reference/ethnocare.ca/shots/` — full-page and above-fold screenshots.

**Media and licensing:**

- `docs/ui-reference/MEDIA-PLAN.md` — retrieve with `git show ":docs/ui-reference/MEDIA-PLAN.md"`.
- `docs/MEDIA-CREDITS.md` — this repository's existing credit ledger.
- `media-manifest.json` — this repository's derivative manifest.

### 14.2 Repository files the produced spec is written against

- `src/app/globals.css` — the token layer, the `data-scheme` system, the print and reduced-motion
  blocks, and the view-transition rules.
- `src/lib/motion.ts` — the nine duration and easing constants.
- `src/components/motion/` — `curtain.tsx`, `hero-motion.tsx`, `hero-parallax.tsx`, `hero-video.tsx`,
  `lit-words.tsx`, `morph.tsx`, `page-transition.tsx`, `particle-field.tsx`, `reveal.tsx`.
- `src/components/sections/` — the 13 section components the routes compose.
- `src/components/layout/` — `header.tsx`, `footer.tsx`, `announcement-bar.tsx`,
  `announcement-live.tsx`.
- `src/content/types.ts` — the content type definitions.
- `e2e/motion.spec.ts` — 1,134 lines of motion, reduced-motion, no-JavaScript and print assertions.
- `e2e/typography.spec.ts`, `e2e/structure.spec.ts`, `e2e/navigation.spec.ts`, `e2e/zoom.spec.ts`,
  `e2e/accessibility.spec.ts`, `e2e/compliance.spec.ts`, `e2e/lead-form.spec.ts` — the rest of the
  suite.
- `playwright.config.ts` — three projects: `desktop`, `mobile`, `reduced-motion`; port `3100`;
  `node scripts/serve-e2e.mjs` as the web server.
- `next.config.ts` — `output: "export"`, the custom image loader, the device and image size ladders.
- `package.json` — the pinned dependency versions and the script names the produced spec must cite.
- `node_modules/next/dist/docs/` — the authority for any Next.js 16 claim.

### 14.3 Skills this run must use

- `/Users/mj/.claude/skills/stack-detective/SKILL.md` — live stack re-derivation, per FR-27.
- `/Users/mj/.claude/skills/media-planner/SKILL.md` — the asset plan, per FR-43.
- `/Users/mj/.claude/skills/design-director/SKILL.md` — the aesthetic direction, per FR-33.
- `/Users/mj/.claude/skills/impeccable/SKILL.md` — available for interface-quality judgement.
- `/Users/mj/.claude/skills/frontend-design/SKILL.md` — available for visual direction judgement.
- `/Users/mj/.claude/skills/sourcing-media/SKILL.md` — available if a specific asset must be located.
- `/Users/mj/.claude/skills/playwright-ui-forensics/SKILL.md` — available only if a claim cannot be
  settled from the corpus, and only in a mode that writes nothing under `docs/`.

### 14.4 Prior run, for context only

- `technomancy_artifacts/SPEC_UI_UPDATE__20260918-221808/project_plan.md` — the previous overhaul's
  plan: 128 functional requirements, 30 scenarios, 95 acceptance criteria. Read for shape, not for
  design decisions, per A-15.
