/**
 * Requirements:
 * - Treat docs/diagrams/*.mmd as the only authority for what the atlas draws.
 * - Render every diagram deterministically, so identical sources produce identical committed bytes.
 * - Fail any diagram that parses but renders nothing: a blank raster is worse than a missing file.
 * - Verify the committed set without a renderer, a browser or a network, so a commit hook and CI
 *   can both run the check.
 *
 *   node scripts/generate-diagrams.mjs                   # render, then write the manifest and SOURCES.md
 *   node scripts/generate-diagrams.mjs --check           # fail if any committed artifact is stale
 *   node scripts/generate-diagrams.mjs --check --render  # additionally re-render and compare pixels
 *
 * The renderer is deliberately absent from package.json, because it pulls a headless browser into
 * the dependency tree of a Next.js application that deploys to a 2 GB instance, and into every
 * `pnpm install --frozen-lockfile` in CI. Install it once, outside this repository:
 *
 *   mkdir -p ~/.local/share/mermaid-cli
 *   npm_config_cache="$TMPDIR/npmcache" \
 *   PUPPETEER_SKIP_DOWNLOAD=1 \
 *   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
 *   npm install --prefix ~/.local/share/mermaid-cli \
 *     @mermaid-js/mermaid-cli@11.17.0 \
 *     puppeteer@25
 *
 * The rasterizer and the framing step are system tools, not npm packages:
 *
 *   brew install librsvg imagemagick
 *
 * Read this before debugging a render that will not start. Under a command sandbox Chrome cannot
 * register a Mach port and dies with `bootstrap_check_in ... Permission denied (1100)`, which reads
 * like a broken browser install and is not one. Rendering has to run unsandboxed; --check alone
 * never launches a browser and is safe anywhere.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const diagramsDir = resolve(root, "docs", "diagrams");
const manifestPath = resolve(diagramsDir, "diagrams.manifest.json");
const sourcesPath = resolve(diagramsDir, "SOURCES.md");
const CHECK = process.argv.includes("--check");
const RENDER = process.argv.includes("--render");

// Scratch for intermediate rasters. Overridable because TMPDIR resolves to different paths inside
// and outside a command sandbox, so a file written by a sandboxed step is invisible to an
// unsandboxed render.
const scratch =
  process.env.DIAGRAM_SCRATCH ?? resolve(tmpdir(), "legacy-benefits-diagrams");

// Both paths are overridable, which is what makes this script portable to another machine. The
// defaults are where the toolchain lands on the machine this was written on.
const mmdc =
  process.env.MMDC ??
  resolve(
    process.env.HOME ?? "",
    ".local/share/mermaid-cli/node_modules/.bin/mmdc",
  );
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH ?? "";

// Byte floors. An output below its floor is treated as absent rather than as complete, because a
// truncated render is the failure this whole script exists to catch: mermaid will happily emit a
// well-formed SVG containing nothing but a background when a directive is malformed.
const SVG_MIN_BYTES = 6144;
const PNG_MIN_BYTES = 24576;

const MERMAID_CLI = "11.17.0";

/**
 * The single source of truth for what gets rendered and how.
 *
 * `width` and `scale` are the pinned per-diagram render settings; `svgId` pins the root element id
 * so the SVG is byte-stable across runs. `roledescription` is the literal the installed renderer
 * emits, checked against a rendered file rather than recalled. `mustContain` is the sentinel set
 * whose absence means the diagram drew nothing readable — each one is a string that can only appear
 * if the figure rendered the part of the system it exists to show.
 */
const DIAGRAMS = [
  {
    id: "LEGEND",
    summary: "The key — shapes, colours and line styles",
    width: 1600,
    scale: 2,
    svgId: "legend",
    roledescription: "flowchart-v2",
    mustContain: ["A person", "Hexagon", "Never happens"],
  },
  {
    id: "D1-system-context",
    summary: "D1 — how a visitor reaches the site",
    width: 1600,
    scale: 2,
    svgId: "d1-system-context",
    roledescription: "flowchart-v2",
    mustContain: ["CloudFront", "Caddy", "Turnstile"],
  },
  {
    id: "D2-render-path",
    summary: "D2 — CMS blocks to a rendered page",
    width: 1600,
    scale: 2,
    svgId: "d2-render-path",
    roledescription: "flowchart-v2",
    mustContain: ["RenderBlocks", "Local", "EmptyPageNotice"],
  },
  {
    id: "D3-lead-lifecycle",
    summary: "D3 — a form submission, click to CRM",
    width: 1500,
    scale: 2,
    svgId: "d3-lead-lifecycle",
    roledescription: "sequence",
    mustContain: ["Turnstile", "honeypot", "idempotency"],
  },
  {
    id: "D4-compliance-data",
    summary: "D4 — the four regulated tables",
    width: 1800,
    scale: 2,
    svgId: "d4-compliance-data",
    roledescription: "flowchart-v2",
    mustContain: ["dnc_requests", "crm_outbox", "soa_submissions"],
  },
  {
    id: "D5-module-map",
    summary: "D5 — every server module and its imports",
    width: 2200,
    scale: 2,
    svgId: "d5-module-map",
    roledescription: "flowchart-v2",
    mustContain: [
      "leads/service.ts",
      "compliance/suppression.ts",
      "db/schema.ts",
    ],
  },
  {
    id: "D6-infra-topology",
    summary: "D6 — the six Terraform modules",
    width: 2000,
    scale: 2,
    svgId: "d6-infra-topology",
    roledescription: "flowchart-v2",
    mustContain: ["modules/network", "modules/compute", "prefix list"],
  },
  {
    id: "D7-pipeline",
    summary: "D7 — push to serving release",
    width: 1800,
    scale: 2,
    svgId: "d7-pipeline",
    roledescription: "flowchart-v2",
    mustContain: ["drizzle-kit migrate", "Systems Manager", "Invalidate"],
  },
  {
    id: "D8-dnc-suppression",
    summary: "D8 — a stop request, taken and enforced",
    width: 1800,
    scale: 2,
    svgId: "d8-dnc-suppression",
    roledescription: "flowchart-v2",
    mustContain: ["dnc_requests", "isSuppressed", "No Turnstile"],
  },
];

const mmdPath = (id) => resolve(diagramsDir, `${id}.mmd`);
const svgPath = (id) => resolve(diagramsDir, `${id}.svg`);
const pngPath = (id) => resolve(diagramsDir, `${id}.png`);
const relativePath = (path) => path.slice(root.length + 1);

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

// An output that is missing, empty, or below its floor all mean the same thing to every caller:
// there is no usable render here.
function present(path, floor) {
  return existsSync(path) && statSync(path).size >= floor;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const stale = (path) =>
  `${relativePath(path)} is stale — run: pnpm diagrams:render`;

const ENTITIES = [
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
  ["&nbsp;", " "],
  ["&amp;", "&"],
];

function decodeEntities(text) {
  let out = text;
  for (const [entity, char] of ENTITIES) out = out.split(entity).join(char);
  return out;
}

/**
 * A label is the text content of a `text` element, plus the text content of each `tspan` inside it.
 * Both are needed: with htmlLabels disabled the renderer splits a flowchart node label into one
 * tspan per word, so the tspans alone never yield a multi-word label, while a sequence diagram
 * keeps whole phrases in the text element. Sorted by the default comparison over UTF-16 code units,
 * because --check compares this array in JavaScript rather than in a shell.
 *
 * This array is what makes --check a real check rather than a checksum. A rendered SVG whose bytes
 * changed for a harmless reason still carries the same labels; one that lost half its nodes does
 * not, and that is the failure worth catching.
 */
function extractLabels(svg) {
  const labels = new Set();
  const add = (raw) => {
    const text = decodeEntities(raw.replace(/<[^>]*>/g, ""))
      .replace(/\s+/g, " ")
      .trim();
    if (text) labels.add(text);
  };
  for (const match of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g))
    add(match[1]);
  for (const match of svg.matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/g))
    add(match[1]);
  return [...labels].sort();
}

/**
 * One collapsed section per diagram, each wrapping a fence whose body is byte-identical to the
 * .mmd file beside it, so the fence and the committed image can never disagree. This is what makes
 * the atlas readable on a platform that renders Mermaid in Markdown but cannot open a .mmd.
 */
function buildSources() {
  const fence = "`".repeat(3);
  const lines = [
    "# Diagram sources",
    "",
    "The Mermaid source of every diagram in this atlas, one fence each, in `LEGEND` then `D1`",
    "through `D8` order. Each fence is byte-identical to the `.mmd` file beside it, so a platform",
    "that renders Mermaid in Markdown draws the same diagram this repository committed as an image.",
    "",
    "This file is generated. Run `pnpm diagrams:render` to rewrite it; never edit it by hand.",
    "",
  ];
  for (const diagram of DIAGRAMS) {
    lines.push(
      "<details>",
      `<summary>${diagram.summary}</summary>`,
      "",
      `${fence}mermaid`,
    );
    lines.push(readFileSync(mmdPath(diagram.id), "utf8").replace(/\n$/, ""));
    lines.push(fence, "", "</details>", "");
  }
  return lines.join("\n");
}

const identify = (format, path) =>
  execFileSync("magick", ["identify", "-format", format, path], {
    encoding: "utf8",
  }).trim();

function dimensions(path) {
  const [width, height] = identify("%w %h", path).split(" ").map(Number);
  return { width, height };
}

/**
 * Two-space indent, keys in a fixed order, one trailing newline. The manifest is the offline record
 * of what a browser produced, which is the only reason --check can verify a render without being
 * able to perform one.
 */
function buildManifest() {
  const diagrams = DIAGRAMS.map((diagram) => {
    const svg = readFileSync(svgPath(diagram.id), "utf8");
    const { width, height } = dimensions(pngPath(diagram.id));
    return {
      id: diagram.id,
      mmd_sha256: sha256(mmdPath(diagram.id)),
      svg_sha256: sha256(svgPath(diagram.id)),
      png_sha256: sha256(pngPath(diagram.id)),
      png_w: width,
      png_h: height,
      render_width: diagram.width,
      render_scale: diagram.scale,
      roledescription: diagram.roledescription,
      labels: extractLabels(svg),
      must_contain: diagram.mustContain,
      unique_colors: Number(identify("%k", pngPath(diagram.id))),
      mermaid_cli: MERMAID_CLI,
      svg_id: diagram.svgId,
    };
  });
  return `${JSON.stringify({ diagrams }, null, 2)}\n`;
}

function renderMermaid(diagram, outputPath, scale) {
  if (!existsSync(mmdc)) {
    fail(
      `the mermaid renderer is not installed at ${mmdc}. Install it outside this repository (see the header of this file), or point MMDC at your copy.`,
    );
  }
  const args = [
    "--input",
    mmdPath(diagram.id),
    "--output",
    outputPath,
    "--puppeteerConfigFile",
    resolve(diagramsDir, "puppeteer-config.json"),
    "--configFile",
    resolve(diagramsDir, "mermaid-config.json"),
    "--svgId",
    diagram.svgId,
    "--backgroundColor",
    "#FFFFFF",
    "--width",
    String(diagram.width),
  ];
  if (scale) args.push("--scale", String(scale));
  args.push("--quiet");

  const env = { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1" };
  if (chrome) env.PUPPETEER_EXECUTABLE_PATH = chrome;

  execFileSync(mmdc, args, { stdio: "inherit", env });
}

// The white mat separates the drawing from the page; the hairline frame gives it an edge on a white
// background. -strip removes the timestamp and colour profile, so identical input yields identical
// bytes — without it every render produces a different file and --check can never pass twice.
function frame(rawPng, outputPath) {
  execFileSync("magick", [
    rawPng,
    "-bordercolor",
    "#FFFFFF",
    "-border",
    "48",
    "-bordercolor",
    "#D6DEE8",
    "-border",
    "2",
    "-strip",
    "-define",
    "png:compression-level=9",
    outputPath,
  ]);
}

function renderAll() {
  mkdirSync(scratch, { recursive: true });
  for (const diagram of DIAGRAMS) {
    const raw = resolve(scratch, `${diagram.id}.raw.png`);
    renderMermaid(diagram, svgPath(diagram.id), 0);
    renderMermaid(diagram, raw, diagram.scale);
    frame(raw, pngPath(diagram.id));

    // The sentinel check runs here, at render time, where the fix is still in front of whoever
    // caused it. A figure that parsed and drew an empty box is the failure mode this catches.
    const labels = extractLabels(
      readFileSync(svgPath(diagram.id), "utf8"),
    ).join("\n");
    for (const sentinel of diagram.mustContain) {
      if (!labels.includes(sentinel)) {
        fail(
          `${diagram.id} rendered without the text ${JSON.stringify(sentinel)} — the figure drew nothing readable`,
        );
      }
    }
    console.log(`  ${diagram.id}`);
  }
}

function readManifest() {
  if (!existsSync(manifestPath)) fail(stale(manifestPath));
  return JSON.parse(readFileSync(manifestPath, "utf8")).diagrams;
}

function runCheck() {
  const recorded = readManifest();

  for (const diagram of DIAGRAMS) {
    if (!existsSync(mmdPath(diagram.id))) {
      fail(
        `${relativePath(mmdPath(diagram.id))} does not exist, but DIAGRAMS declares it`,
      );
    }
    if (!present(svgPath(diagram.id), SVG_MIN_BYTES))
      fail(stale(svgPath(diagram.id)));
    if (!present(pngPath(diagram.id), PNG_MIN_BYTES))
      fail(stale(pngPath(diagram.id)));
  }

  if (recorded.length !== DIAGRAMS.length) fail(stale(manifestPath));

  for (const diagram of DIAGRAMS) {
    const entry = recorded.find((candidate) => candidate.id === diagram.id);
    if (!entry) fail(stale(manifestPath));

    if (entry.mmd_sha256 !== sha256(mmdPath(diagram.id)))
      fail(stale(mmdPath(diagram.id)));
    if (entry.svg_sha256 !== sha256(svgPath(diagram.id)))
      fail(stale(svgPath(diagram.id)));
    if (entry.png_sha256 !== sha256(pngPath(diagram.id)))
      fail(stale(pngPath(diagram.id)));

    const svg = readFileSync(svgPath(diagram.id), "utf8");
    const labels = extractLabels(svg);
    if (labels.join("\n") !== (entry.labels ?? []).join("\n"))
      fail(stale(svgPath(diagram.id)));

    // Re-checked from the committed bytes, not restated from the manifest. A sentinel recorded in
    // the manifest but absent from the SVG means the committed image is not the one the manifest
    // describes, which is exactly the drift a checksum alone would miss.
    for (const sentinel of diagram.mustContain) {
      if (!labels.join("\n").includes(sentinel)) {
        fail(
          `${relativePath(svgPath(diagram.id))} no longer contains ${JSON.stringify(sentinel)}`,
        );
      }
    }

    // The first line of every source has to be the shared init directive, byte for byte. A source
    // that lost it renders in mermaid's default theme, which looks fine on its own and wrong
    // beside the other eight.
    const firstLine = readFileSync(mmdPath(diagram.id), "utf8").split("\n")[0];
    if (!firstLine.startsWith("%%{init:")) {
      fail(
        `${relativePath(mmdPath(diagram.id))} line 1 is not the shared init directive`,
      );
    }
  }

  const sharedInit = readFileSync(mmdPath("D1-system-context"), "utf8").split(
    "\n",
  )[0];
  for (const diagram of DIAGRAMS) {
    const firstLine = readFileSync(mmdPath(diagram.id), "utf8").split("\n")[0];
    if (firstLine !== sharedInit) {
      fail(
        `${relativePath(mmdPath(diagram.id))} line 1 differs from D1-system-context.mmd — every diagram must share one theme block`,
      );
    }
  }

  const sources = buildSources();
  const committedSources = existsSync(sourcesPath)
    ? readFileSync(sourcesPath, "utf8")
    : "";
  if (committedSources !== sources) fail(stale(sourcesPath));

  if (
    readFileSync(manifestPath, "utf8") !==
    buildManifestWithoutImageMagick(recorded)
  ) {
    fail(stale(manifestPath));
  }

  return recorded;
}

// --check must not shell out to ImageMagick, so the two measured pixel values are taken from the
// manifest entry itself. Everything else is recomputed from the committed bytes, which is what
// makes this a check rather than a restatement.
function buildManifestWithoutImageMagick(recorded) {
  const diagrams = DIAGRAMS.map((diagram) => {
    const entry = recorded.find((candidate) => candidate.id === diagram.id);
    return {
      id: diagram.id,
      mmd_sha256: sha256(mmdPath(diagram.id)),
      svg_sha256: sha256(svgPath(diagram.id)),
      png_sha256: sha256(pngPath(diagram.id)),
      png_w: entry.png_w,
      png_h: entry.png_h,
      render_width: diagram.width,
      render_scale: diagram.scale,
      roledescription: diagram.roledescription,
      labels: extractLabels(readFileSync(svgPath(diagram.id), "utf8")),
      must_contain: diagram.mustContain,
      unique_colors: entry.unique_colors,
      mermaid_cli: MERMAID_CLI,
      svg_id: diagram.svgId,
    };
  });
  return `${JSON.stringify({ diagrams }, null, 2)}\n`;
}

// Normalized RMSE, read from the parenthesised figure ImageMagick prints. compare exits non-zero
// whenever the images differ at all, so the number is taken from stderr either way.
function normalizedRmse(a, b) {
  try {
    const out = execFileSync(
      "magick",
      ["compare", "-metric", "RMSE", a, b, "null:"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    return Number(/\(([\d.e-]+)\)/.exec(out)?.[1] ?? 0);
  } catch (error) {
    const text = `${error.stderr ?? ""}${error.stdout ?? ""}`;
    const matched = /\(([\d.e-]+)\)/.exec(text);
    if (!matched) throw error;
    return Number(matched[1]);
  }
}

function runDeepCheck() {
  mkdirSync(scratch, { recursive: true });
  for (const diagram of DIAGRAMS) {
    const freshSvg = resolve(scratch, `${diagram.id}.fresh.svg`);
    const freshRaw = resolve(scratch, `${diagram.id}.fresh.raw.png`);
    const freshPng = resolve(scratch, `${diagram.id}.fresh.png`);

    renderMermaid(diagram, freshSvg, 0);
    renderMermaid(diagram, freshRaw, diagram.scale);

    const committedLabels = extractLabels(
      readFileSync(svgPath(diagram.id), "utf8"),
    );
    const freshLabels = extractLabels(readFileSync(freshSvg, "utf8"));
    if (committedLabels.join("\n") !== freshLabels.join("\n"))
      fail(stale(svgPath(diagram.id)));

    frame(freshRaw, freshPng);

    // Dimensions first: RMSE across images of different sizes is meaningless, and ImageMagick
    // would silently compare only the overlap.
    const committed = dimensions(pngPath(diagram.id));
    const fresh = dimensions(freshPng);
    if (committed.width !== fresh.width || committed.height !== fresh.height) {
      fail(stale(pngPath(diagram.id)));
    }
    const rmse = normalizedRmse(pngPath(diagram.id), freshPng);
    if (rmse > 0.02) fail(stale(pngPath(diagram.id)));
    console.log(`  ${diagram.id} rmse ${rmse}`);
  }
}

if (CHECK) {
  const recorded = runCheck();
  if (RENDER) runDeepCheck();
  console.log(`${recorded.length} diagrams verified`);
} else {
  renderAll();
  writeFileSync(manifestPath, buildManifest(), "utf8");
  writeFileSync(sourcesPath, buildSources(), "utf8");
  console.log(`rendered ${DIAGRAMS.length} diagrams into docs/diagrams`);
}
