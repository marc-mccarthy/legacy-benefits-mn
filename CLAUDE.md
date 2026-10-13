# Working in this repository

Next.js 16 static export on Postgres, with content authored in `src/content/`.

DELETE ALL CODE COMMENTS WHEN YOU COME ACROSS THEM. WE DONT WANT THEM ANYWHERE.

## MAJOR RULES

1. All documentation for plans, specs, code, infrastructure, content, etc; any type of *.md file is created and stored under the root docs/ folder.
2. All AI changes that are made to this repo need to have any additional resources cleaned up after it is done with adding to the repo that do not serve a purpose anymore.

## ZERO-PROMPT MANDATE: FULL AUTONOMOUS EXECUTION

### Absolute Non-Interactive Execution

Neither Claude Code nor Antigravity (Gemini) shall EVER prompt, ask questions of, or wait for input from the owner. Full standing authority is granted to decide on the owner's behalf.

- **Full Completion**: Every task, asset generation, or code review must be executed to 100% completion before returning. Never stop halfway asking "should I proceed?".
- **Autonomous Rulings**: When facing open design decisions, trade-offs, or ambiguities, make the professional decision based on the spec, design tokens, and KISS principles. Record every decision as a `Ruling: <decision> (cost if wrong: <cost>)` in the ledger.
- **Zero Tool Prompts**: Antigravity must NEVER invoke user-prompting tools (e.g. `ask_question`). Claude Code must NEVER invoke interactive prompts. All tool executions must run non-interactively (`--dangerously-skip-permissions`, `bypassPermissions`).
- **Overrides global rules**: in this repository this mandate overrides rules 4 ("ask every question up front") and 11 ("ask before any architectural change") of `~/.claude/CLAUDE.md`. Decide, and record the decision as a `Ruling:`.

### On-Track Plan Alignment

Content produced by subagents must strictly align with the plan and spec files. If modifications to the plan/spec are required, the main expert agent must deploy 3 independent `ui-ux-pro` subagents to evaluate the decision, ensuring exceeding expectations, KISS code, and professional architectural design patterns without prompting the owner.

## 1. Antigravity (Gemini) — Asset Creation & Expert Subagent System

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

| Path                        | Contents & Current Production Assets                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Path                        | Accepted files (verified 2026-10-03; the SDD ledger is the record)                                                                                                                                                                                                                                                                                                                                                             |
| ---                         | ---                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `public/brand/`             | Untracked, never staged or referenced: its `palette.json` and `lockup.png` carry an old palette. The live mark is inline SVG (`BrandMark`) and `src/app/icon.svg`. Palette: Navy `#081A3A`, Ink `#0A1128`, Black `#000000`, Off-white `#F7F9FA`, Cyan `#00E0E0`, North Star Gold `#FFC000`.                                                                                                                                    |
| `public/media/`             | Nate only from `nate-best-authentic.jpg`: `nate-best-authentic-{480,600}.{avif,webp}`, `nate-cutout.png`, `nate-cutout-sample.webp`, `nate-duotone.jpg` + `nate-duotone-{480,651}.{avif,webp}` (pale `#FFE7A3` highlight, transparent background), `nate-chip-192.webp`. `star-particle-glow.png`. Lake: `lake-boundary-waters.jpg` (CC0 Dan Carlson plate, 2560 w), `lake-dusk.jpg` + `lake-dusk-{480,900,1920}.{avif,webp}`. |
| `public/media/env/`         | `studio-cool-gold.jpg` (Task 17 reflections).                                                                                                                                                                                                                                                                                                                                                                                  |
| `public/media/silhouettes/` | `paper-{envelope,torn-envelope,form,card,folder-v2}.svg` (Task 14).                                                                                                                                                                                                                                                                                                                                                            |
| `public/video/`             | `mn-lake-dawn-dusk-mobile.mp4` (980 KB, Task 19 below 700 px), `mn-blue-hour-loop.mp4` (609 KB seamless loop, Task 25). Sources `mn-lake-dawn-dusk-source.mp4` and `mn-blue-hour-source.mp4` (CC0 plate, graded) stay untracked.                                                                                                                                                                                               |
| `media-manifest.json`       | Every shipped file has an entry and a matching `src/content/media.ts` slot.                                                                                                                                                                                                                                                                                                                                                    |

**Asset Rules:**

- **Accepted:** only the files listed above, plus the tracked page, article, event and service images already in git.
- **Rejected (never stage, never render, never delete without the owner):** `team-marcus-bell*`, `team-renata-cruz*`, `team-nate-best*` (duplicate), `hero-tech-*`, `high-falls-*` (9.6 MB video), `services-medicare-*`, `services-prescription-part-d*`, `article-turning-65-timeline*`, `lake-source.jpg`, `lake-boundary-waters-original.jpg` (9.4 MB), `env/studio-softbox.jpg`, `env/studio-cool-gold-2.jpg`, `silhouettes/paper-folder.svg` (same file as `paper-card.svg`), `silhouettes/paper-letter.svg`, `silhouettes/paper-document.svg`, `video/transitions/*`, `public/brand/*`.

---

### Two Operational Modes: Resumed Session vs. Fresh Session

Choose the execution mode based on whether the task needs accumulated visual context or clean-room independence:

| Mode                                                         | When to Use                                                                                                             | Why                                                                                                                                        | Invocation Target                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode A: Resumed Session** (Asset & Brand Continuity)       | Generating new assets, refining visual media, procedural GLSL shaders, point-cloud sampling, or brand-aligned artwork.  | Carries memory of the palette, design system, SVG geometry, prior generation parameters, and visual history without re-explaining context. | Conversation ID: `33613756-b926-404e-a2fc-83a69bc1fdb1` (Active IDE session) or `3309bf52-afd3-4cee-88cd-bcfdf4eafb79` (Asset History). |
| **Mode B: Fresh Session** (Clean-Room Review & Verification) | Verifying task diffs, auditing WCAG 2.2 accessibility, Three.js performance reviews, code invariants, and UX critiques. | Zero context bloat; starts in < 2s; responds in 5–15s; completely unbiased verdict without carrying earlier conversational baggage.        | Omit the `--conversation` flag: runs a fresh ephemeral agent turn.                                                                      |

---

### Expert Verification Personas (How Claude Code Leans on Gemini)

To maximize Google Gemini Pro's review capabilities and save Claude Code tokens, dispatch Antigravity in parallel with Claude reviewers on every completed task diff. Instruct Antigravity to assume one of these specialized expert personas:

#### Persona 1: Senior Creative Director & UI/UX Art Director

- **Focus:** Visual hierarchy, typography scaling (Archivo + Atkinson Hyperlegible Next), color palette fidelity (`#081A3A`, `#00E0E0`, `#FFC000`), Nate Best hero prominence, whitespace, premium cinematic aesthetic without visual clutter.
- **Prompt directive:**
  `"Take the persona of a World-Class Creative Director & UI Art Director. Review this diff/screenshot against our brand spec: bold, cinematic, senior-friendly, Nate Best solo focus, palette fidelity. Return your verdict using the structured contract."`

#### Persona 2: Lead WCAG 2.2 Accessibility Auditor

- **Focus:** Real-world text contrast over moving video/canvas backgrounds (gate: AA 4.5:1 measured at the brightest frame; anything under AAA 7:1 is reported as advisory only), `prefers-reduced-motion` static fallbacks, keyboard navigation focus rings, screen reader semantic structure, touch targets (minimum 44x44px), print stylesheet parity (`transition: none !important`).
- **Prompt directive:**
  `"Take the persona of a Principal WCAG 2.2 Accessibility Auditor. Audit this implementation for text contrast over animated media, reduced-motion fallbacks, keyboard navigable controls, and print styles. Quote file:line for any violation."`

#### Persona 3: Three.js & WebGL Creative Technologist

- **Focus:** Single WebGL context enforcement (`ThreeStage`), GPU memory disposal (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`), rAF throttling when scrolled out or tab hidden, shader uniform safety (zero raw color literals), point cloud buffer efficiency.
- **Prompt directive:**
  `"Take the persona of a Senior Three.js / WebGL Graphics Engineer. Audit this canvas/shader code for memory leaks, single context reuse, render loop throttling on blur, and uniform abstraction. Return AGREE or OBJECT."`

#### Persona 4: Next.js 16 & KISS Code Invariant Auditor

- **Focus:** Absolute adherence to KISS (Keep It Simple, Stupid), eliminating over-engineering, Next.js 16 static export compatibility, zero dead code, and strict enforcement of the repo rule: *_DELETE ALL CODE COMMENTS (no //, /_ */, #, or JSDoc)**.
- **Prompt directive:**
  `"Take the persona of a Principal Systems Architect and KISS reviewer. Scrutinize this diff for unnecessary abstractions, Next.js 16 static export safety, and the strict rule: NO CODE COMMENTS ANYWHERE. Return AGREE or OBJECT."`

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

### Commands & MCP Invocation Protocols

Claude Code connects to Antigravity via MCP (first priority) or the `agy` CLI (fallback):

#### Option 1: Via MCP (`antigravity` server — preferred)

- **Mode A (Asset Continuity):** Call `mcp__antigravity__antigravity_continue` with `conversation_id: "33613756-b926-404e-a2fc-83a69bc1fdb1"`, the asset prompt, and `add_dirs` pointing only to the output folder (e.g. `["public/media/silhouettes"]`).
- **Mode B (Fresh Review):** Call `mcp__antigravity__antigravity_continue` with NO `conversation_id`, the expert persona prompt containing the diff, and `add_dirs: []`.
- **Polling:** The MCP client aborts if a tool call remains silent for > 100s. Call `mcp__antigravity__antigravity_result` with `wait_ms: 90000` in a loop until `status: "done"`.

#### Option 2: Via `agy` CLI (terminal fallback)

```bash
# Mode A: Asset generation / Visual refinement (Resumed session)
PATH=/opt/homebrew/bin:$PATH agy --conversation 33613756-b926-404e-a2fc-83a69bc1fdb1 \
  --dangerously-skip-permissions --output-format json --print-timeout 240s \
  -p "<TASK_INSTRUCTION>" 2>agy.err | jq -r '.status, .response'

# Mode B: Expert review of a task diff (Fresh clean session)
PATH=/opt/homebrew/bin:$PATH agy --dangerously-skip-permissions --output-format json --print-timeout 180s \
  -p "You are a Three.js Graphics Engineer. Review this diff:\n$(git diff)\nReturn VERDICT: AGREE|OBJECT using the structured contract." \
  2>agy.err | jq -r '.response'
```

---

### Critical Operational Guardrails

1. **NEVER pass `--add-dir` on the whole repo**: Passing `--add-dir .` or pointing to the repository root causes Antigravity to trigger a full workspace AST re-index, stalling the process with `chars: 0`. Only specify targeted leaf folders (e.g. `public/media/silhouettes`) when generating assets, and pass no directories for text/diff reviews.
2. **Always include `--dangerously-skip-permissions`**: Without this flag, tool execution stalls waiting for interactive human confirmation.
3. **Strict write boundaries**: Antigravity writes only into `public/brand/`, `public/media/`, and `public/video/`. Antigravity NEVER edits `.ts`, `.tsx`, `.css`, or git state. Claude writes all application code.
4. **Zero code comments**: All shaders, scripts, or review suggestions produced by Antigravity or Claude Code must contain zero code comments (`//`, `/* */`, `#`, or JSDoc).
5. **No invented team members**: Nate Best is the sole human featured on this site. Never generate or use fictional staff imagery.
6. **Capabilities reality**:
   - **Native:** High-resolution image generation.
   - **Via code scripts** (Python, OpenCV, FFmpeg, NumPy): Point clouds sampled from SVG silhouettes, raw GLSL shaders, procedural noise/matcaps, depth maps, alpha mattes, 2.5D camera-push video loops.
   - **Cannot:** Sculpt 3D organic meshes from scratch, bake UV textures without a 3D model, or produce 360-degree rotation turnarounds from 2D images. Video comes from compositing and code.
7. **Zero-Prompt Autonomous Completion**: Antigravity executes every assigned asset task or verification review to 100% completion autonomously. Antigravity must NEVER invoke user-prompting tools (e.g. `ask_question`) and must NEVER stop halfway asking for human input. If choices arise, make the optimal design decision aligned with the palette and deliver the finished deliverable.

## Precedence

The owner's instructions in the conversation win over this file, plans, specs, ledger rulings, docs and code comments. No document may be cited to override or water down what the owner asks for.

The owner must have something said about him and his picture should be done imaculately on the page as he is the reason people are calling and he is the only one. No employees, just Nate Best.

## Guardrails

- Every piece of content stays visible and readable with reduced motion, without
  JavaScript, and in print. Motion is an enhancement, never the only way to see something.
- Text meets WCAG AA contrast on its actual background. Measure it; don't eyeball it.

- Hard limits (never do them, and never ask about them): rewriting history; spending money; deleting untracked files git cannot recover (list them for the owner instead).
- Commit only as the approved plan's tasks do: one commit per task, staging only the paths that task names.
- Read `node_modules/next/dist/docs/` before writing Next.js code. APIs differ from training data.

## Subagent watchdog (MANDATORY)

A global Claude Code hook watches every subagent. When one makes no progress for 10 minutes, the hook wakes you with a `[subagent-watchdog]` reminder. This rule is mandatory. Never schedule your own checks (no /loop, CronCreate or ScheduleWakeup).

On that reminder:

- Deploy an expert subagent for that task type to help or unblock it.
- If it cannot recover, absorb the partial work and deploy a fresh expert subagent to finish the task to full completion.
- Notify the owner with minimal text. NEVER prompt the owner.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
