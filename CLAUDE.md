# CLAUDE.md

## Antigravity (Gemini) — Asset Creation & Expert Subagent System

Antigravity (Gemini Pro) is a core partner in this repository. It serves two distinct roles:

1. **Visual & Motion Asset Producer** (imagery, videos, shaders, point clouds, textures, transitions).
2. **Independent Expert Review & Verification Subagent** for Claude Code's task diffs, design quality, accessibility, and architectural invariants.

Claude Code exclusively owns all application source code (`.ts`, `.tsx`, `.css`), tests, and git operations. Antigravity never edits source code or touches git.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLAUDE CODE                               │
│  - Architecture & Execution Lead (superpowers:subagent-driven-dev)     │
│  - Exclusive code owner (.ts, .tsx, .css, Playwright/Vitest, Git)      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
     Mode A: Asset Continuity          Mode B: Clean-Room Verification
     (Resumed Session)                 (Fresh Session)
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│   ANTIGRAVITY: ASSET GENERATOR       │  │  ANTIGRAVITY: EXPERT REVIEWER │
│   - Session: 33613756-b926-404e-     │  │  - Ephemeral / Fresh turn     │
│     a2fc-83a69bc1fdb1                │  │  - 4 Expert Review Personas   │
│   - Visual & motion assets           │  │  - Structured AGREE | OBJECT  │
│   - Procedural shaders & points      │  │  - Zero context baggage       │
│   - Writes to public/media & video   │  └───────────────────────────────┘
└──────────────────────────────────────┘
```

---

### Media Library Inventory & Location

All visual assets reside under `public/`. Master metadata and responsive variants are tracked in `media-manifest.json`:

| Path                        | Accepted files (verified 2026-10-03; the SDD ledger is the record)                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/brand/`             | Untracked, never staged or referenced: its `palette.json` and `lockup.png` carry an old palette. The live logo is `public/media/logo/lbg-sprite.svg` (built by `scripts/logo-sprite.mjs` from `brand/logo/`), rendered by `BrandLockup` and `BrandLogo` in `src/components/ui/brand-mark.tsx`; the favicon is `src/app/icon.svg`. Palette: Navy `#081A3A`, Ink `#0A1128`, Black `#000000`, Off-white `#F7F9FA`, Cyan `#00E0E0`, North Star Gold `#FFC000`. |
| `public/media/`             | Nate only from `nate-best-authentic.jpg`: `nate-best-authentic-{480,600}.{avif,webp}`, `nate-cutout.png`, `nate-cutout-sample.webp`, `nate-duotone.jpg` + `nate-duotone-{480,651}.{avif,webp}` (pale `#FFE7A3` highlight, transparent background), `nate-chip-192.webp`. `star-particle-glow.png`. Lake: `lake-boundary-waters.jpg` (CC0 Dan Carlson plate, 2560 w), `lake-dusk.jpg` + `lake-dusk-{480,900,1920}.{avif,webp}`.                             |
| `public/media/env/`         | `studio-cool-gold.jpg` (Task 17 reflections).                                                                                                                                                                                                                                                                                                                                                                                                              |
| `public/media/silhouettes/` | `paper-{envelope,torn-envelope,form,card,folder-v2}.svg` (Task 14).                                                                                                                                                                                                                                                                                                                                                                                        |
| `public/video/`             | `mn-lake-dawn-dusk-mobile.mp4` (980 KB, Task 19 below 700 px), `mn-blue-hour-loop.mp4` (609 KB seamless loop, Task 25). Sources `mn-lake-dawn-dusk-source.mp4` and `mn-blue-hour-source.mp4` (CC0 plate, graded) stay untracked.                                                                                                                                                                                                                           |
| `media-manifest.json`       | Every shipped file has an entry and a matching `src/content/media.ts` slot.                                                                                                                                                                                                                                                                                                                                                                                |

**Asset Rules:**

- **Accepted:** only the files listed above, plus the tracked page, article, event and service images already in git.
- **Rejected (never stage, never render, never delete without the owner):** `team-marcus-bell*`, `team-renata-cruz*`, `team-nate-best*` (duplicate), `hero-tech-*`, `high-falls-*` (9.6 MB video), `services-medicare-*`, `services-prescription-part-d*`, `article-turning-65-timeline*`, `lake-source.jpg`, `lake-boundary-waters-original.jpg` (9.4 MB), `env/studio-softbox.jpg`, `env/studio-cool-gold-2.jpg`, `silhouettes/paper-folder.svg` (same file as `paper-card.svg`), `silhouettes/paper-letter.svg`, `silhouettes/paper-document.svg`, `video/transitions/*`, `public/brand/*`.

---

### Structured Review Contract

All verification requests to Antigravity must enforce this exact output format so Claude Code can act without parsing prose:

```
VERDICT: AGREE | OBJECT

[If OBJECT]
LENS: <Design | WCAG | ThreeJS | CodeQuality>
LOCATION: <file:line>
REASON: <concise explanation of violation or flaw>
REQUIRED_FIX: <exact, copy-pasteable replacement code or asset instruction>
```

---

## Guardrails

- Every piece of content stays visible and readable with reduced motion, without
  JavaScript, and in print. Motion is an enhancement, never the only way to see something.
- Text meets WCAG AA contrast on its actual background. Measure it; don't eyeball it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
