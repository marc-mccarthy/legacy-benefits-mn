# The diagram atlas

Eight figures describing this site.

| Figure               | What it answers                                                   |
| -------------------- | ----------------------------------------------------------------- |
| `LEGEND`             | What every shape, colour and line style in the other seven means  |
| `D1-system-context`  | How a visitor reaches the site, and what the application talks to |
| `D2-render-path`     | How an authored content module becomes a rendered page            |
| `D3-lead-lifecycle`  | What happens to a form submission, from the click to the CRM      |
| `D4-compliance-data` | The four regulated tables, what each proves, and what links them  |
| `D5-module-map`      | Every server module and its imports — **derived from the code**   |
| `D7-pipeline`        | What runs between a push and the new release serving              |
| `D8-dnc-suppression` | How a stop request is taken, stored, and enforced afterwards      |

## Reading them

Read [`SOURCES.md`](SOURCES.md). It carries all eight as fenced Mermaid, one collapsed
section each, which GitHub renders natively and VS Code renders in Markdown preview with
`bierner.markdown-mermaid` (a workspace recommendation — VS Code prompts on folder open).

The `.mmd` files are the sources. They are not meant to be opened directly: stock VS Code
shows one as plain text, and `SOURCES.md` already carries every byte of them.

Every `.mmd` opens with a `%%{init: ...}%%` directive carrying the whole theme, and all
eight carry the **same** directive byte for byte. `pnpm diagrams:check` fails if they ever
diverge, so do not strip that line to "clean up" a source.

## Regenerating

`D5-module-map.mmd` is **generated** from the imports under `src/lib` and `src/api` — never
edit it by hand. The other seven are hand-authored.

```sh
pnpm diagrams:derive   # rewrite D5 from the code
pnpm diagrams:build    # derive, then rewrite the manifest and SOURCES.md
pnpm diagrams:check    # fail if either is stale
```

All three only read and write files. Nothing needs installing.

A module added under `src/lib` without being placed in a group in
`scripts/generate-derived-diagrams.mjs` is a **hard error**, not a warning: a map that
silently omits a module still reads as complete.
