# Viewing and regenerating these diagrams

Nine figures describing this site: a legend, and `D1` through `D8`. Each is committed three
times — the Mermaid source (`.mmd`) and the two artifacts the generator renders from it
(`.svg` and `.png`) — so the atlas is readable on GitHub, in an editor, and in a printed
review without anyone needing the renderer installed.

| Figure               | What it answers                                                   |
| -------------------- | ----------------------------------------------------------------- |
| `LEGEND`             | What every shape, colour and line style in the other eight means  |
| `D1-system-context`  | How a visitor reaches the site, and what the application talks to |
| `D2-render-path`     | How an editor's blocks in the CMS become a rendered page          |
| `D3-lead-lifecycle`  | What happens to a form submission, from the click to the CRM      |
| `D4-compliance-data` | The four regulated tables, what each proves, and what links them  |
| `D5-module-map`      | Every server module and its imports — **derived from the code**   |
| `D6-infra-topology`  | The six Terraform modules and the resources each one owns         |
| `D7-pipeline`        | What runs between a push and the new release serving              |
| `D8-dnc-suppression` | How a stop request is taken, stored, and enforced afterwards      |

`SOURCES.md` carries all nine sources as fenced Mermaid, one collapsed section each, for
reading them where a `.mmd` will not open.

## Viewing

**No install.** Open the `.svg` next to the source — VS Code renders it in its image preview,
zoomable, and it is byte-identical to what the generator produced. For `D1-system-context.mmd`,
open `D1-system-context.svg`.

**With the extension.** Stock VS Code renders Mermaid only inside ` ```mermaid ` fences in
Markdown preview; a bare `.mmd` opens as plain text with no highlighting and no preview.
Install the workspace recommendations (VS Code prompts on folder open, or run
**Extensions: Show Recommended Extensions**):

- `MermaidChart.vscode-mermaid-chart` — syntax highlighting for `.mmd`, plus
  **Mermaid: Preview Diagram** (`Cmd+Shift+P`) for a live side-by-side pane with pan and zoom.
- `bierner.markdown-mermaid` — renders the fenced blocks in `SOURCES.md`.

Every `.mmd` opens with a `%%{init: {"theme":"base", ...}}%%` directive carrying the whole
theme, and every one of the nine carries the **same** directive byte for byte — the generator's
`--check` fails if they ever diverge. The extension preview honours it, so what you see in the
pane matches the committed PNG. Do not strip that block to "clean up" a source: the rendered
output would drift from the committed artifacts, and `pnpm diagrams:check` would fail.

## Regenerating

`D5-module-map.mmd` is **generated** from the imports under `src/lib` and `src/app/api` — never
edit it by hand. The other eight are hand-authored.

```sh
pnpm diagrams:derive   # rewrite D5 from the code. Offline, no browser.
pnpm diagrams:render   # derive, then re-render every SVG and PNG, the manifest and SOURCES.md
pnpm diagrams:check    # verify the committed bytes match their sources. Offline, no browser.
pnpm diagrams:verify   # as above, plus re-render and compare pixels
```

`pnpm diagrams:check` is what the pre-commit hook runs, and it needs nothing installed.
`pnpm diagrams:render` needs the toolchain below.

### The rendering toolchain

Deliberately **not** in `package.json`. The renderer pulls a headless browser, and this
repository's dependency tree is installed on a 2 GB instance and on every CI run. Install it
once, outside the repository:

```sh
mkdir -p ~/.local/share/mermaid-cli
npm_config_cache="$TMPDIR/npmcache" \
PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
npm install --prefix ~/.local/share/mermaid-cli @mermaid-js/mermaid-cli@11.17.0 puppeteer@25

brew install librsvg imagemagick
```

`scripts/generate-diagrams.mjs` resolves `mmdc` from that path; override with `MMDC`, and point
`PUPPETEER_EXECUTABLE_PATH` at a Chrome binary if Puppeteer did not download one.

Two failures worth recognising rather than debugging:

- **`bootstrap_check_in ... Permission denied (1100)`** — Chrome cannot register a Mach port
  under a command sandbox. It is not a broken browser. Run the render unsandboxed; `--check`
  never launches one.
- **A figure that renders but is empty.** The generator asserts a set of sentinel strings per
  diagram and fails the render if any is missing, because a Mermaid source with a malformed
  directive produces a well-formed SVG containing nothing.

## What blocks a commit

`.husky/pre-commit` runs `scripts/check-diagrams-staged.mjs`, which exits immediately unless
the commit stages something it cares about:

| Staged                   | Checked                                | Fix                    |
| ------------------------ | -------------------------------------- | ---------------------- |
| `docs/diagrams/*.mmd`    | the committed SVG and PNG are current  | `pnpm diagrams:render` |
| `src/lib`, `src/app/api` | `D5` still matches the imports on disk | `pnpm diagrams:derive` |

Neither check launches a browser. Bypass, when the documentation is knowingly being fixed in a
follow-up: `git commit --no-verify`.

A module added under `src/lib` without being placed in a group in
`scripts/generate-derived-diagrams.mjs` is a **hard error**, not a warning. That is deliberate:
a map that silently omits a module still reads as complete, which is worse than no map.
