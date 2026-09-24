/**
 *   node scripts/generate-diagrams.mjs          # write the manifest and SOURCES.md
 *   node scripts/generate-diagrams.mjs --check  # fail if either is stale
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const root = resolve(import.meta.dirname, "..");
const diagramsDir = resolve(root, "docs", "diagrams");
const manifestPath = resolve(diagramsDir, "diagrams.manifest.json");
const sourcesPath = resolve(diagramsDir, "SOURCES.md");
const CHECK = process.argv.includes("--check");

// `mustContain` is the sentinel set per figure: strings that can only be in the source if it
// still draws the part of the system it exists to show. They are matched against the .mmd text,
// so a figure gutted of its content fails even though its bytes are internally consistent.
const DIAGRAMS = [
  {
    id: "LEGEND",
    summary: "The key — shapes, colours and line styles",
    mustContain: ["A person", "Hexagon", "Never happens"],
  },
  {
    id: "D1-system-context",
    summary: "D1 — how a visitor reaches the site",
    mustContain: ["CloudFront", "Caddy", "Turnstile"],
  },
  {
    id: "D2-render-path",
    summary: "D2 — a content module to a rendered page",
    mustContain: ["RenderBlocks", "src/content/*.ts", "getBusinessIdentity"],
  },
  {
    id: "D3-lead-lifecycle",
    summary: "D3 — a form submission, click to CRM",
    mustContain: ["Turnstile", "honeypot", "idempotency"],
  },
  {
    id: "D4-compliance-data",
    summary: "D4 — the four regulated tables",
    mustContain: ["dnc_requests", "crm_outbox", "soa_submissions"],
  },
  {
    id: "D5-module-map",
    summary: "D5 — every server module and its imports",
    mustContain: [
      "leads/service.ts",
      "compliance/suppression.ts",
      "db/schema.ts",
    ],
  },
  {
    id: "D7-pipeline",
    summary: "D7 — push to serving release",
    mustContain: ["drizzle-kit migrate", "Systems Manager", "Invalidate"],
  },
  {
    id: "D8-dnc-suppression",
    summary: "D8 — a stop request, taken and enforced",
    mustContain: ["dnc_requests", "isSuppressed", "No Turnstile"],
  },
];

const mmdPath = (id) => resolve(diagramsDir, `${id}.mmd`);
const relativePath = (path) => path.slice(root.length + 1);

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const linesOf = (id) => readFileSync(mmdPath(id), "utf8").split("\n");
const firstLineOf = (id) => linesOf(id)[0];
const classDefsOf = (id) =>
  linesOf(id).filter((line) => line.startsWith("classDef "));

function fail(message) {
  console.error(message);
  process.exit(1);
}

const stale = (path) =>
  `${relativePath(path)} is stale — run: pnpm diagrams:build`;

/**
 * One collapsed section per diagram, each wrapping a fence whose body is byte-identical to the
 * .mmd file beside it. The trailing newline is stripped so the fence closes on its own line.
 */
function buildSources() {
  const fence = "`".repeat(3);
  const lines = [
    "# Diagram sources",
    "",
    "Every diagram in this atlas, one fence each, in `LEGEND` then `D1` through `D8` order.",
    "Each fence is byte-identical to the `.mmd` file beside it.",
    "",
    "This file is generated. Run `pnpm diagrams:build` to rewrite it; never edit it by hand.",
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

// Two-space indent, keys in a fixed order, one trailing newline — --check compares the rendered
// string rather than the parsed object, so the formatting has to be reproducible.
function buildManifest() {
  const diagrams = DIAGRAMS.map((diagram) => ({
    id: diagram.id,
    summary: diagram.summary,
    mmd_sha256: sha256(mmdPath(diagram.id)),
  }));
  return `${JSON.stringify({ diagrams }, null, 2)}\n`;
}

/**
 * mermaid's parser is pure JS but reaches for a DOM through DOMPurify, so jsdom stands in for
 * one. `navigator` is getter-only on globalThis in Node, so it has to be defined rather than
 * assigned.
 */
async function parseAll() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of ["window", "document", "Element", "SVGElement", "Node"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
  }
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });

  let mermaid;
  try {
    ({ default: mermaid } = await import("mermaid"));
  } catch {
    fail("mermaid is not installed — run: pnpm install");
  }

  for (const diagram of DIAGRAMS) {
    const path = relativePath(mmdPath(diagram.id));
    try {
      await mermaid.parse(readFileSync(mmdPath(diagram.id), "utf8"));
    } catch (error) {
      fail(`${path} is not valid Mermaid — ${String(error.message).trim()}`);
    }
  }
}

function runCheck() {
  for (const diagram of DIAGRAMS) {
    if (!existsSync(mmdPath(diagram.id))) {
      fail(
        `${relativePath(mmdPath(diagram.id))} does not exist, but DIAGRAMS declares it`,
      );
    }
  }

  // The first line of every source has to be the shared init directive, byte for byte. A source
  // that lost it renders in mermaid's default theme, which looks fine on its own and wrong
  // beside the other seven.
  const sharedInit = firstLineOf("D1-system-context");
  if (!sharedInit.startsWith("%%{init:")) {
    fail(
      `${relativePath(mmdPath("D1-system-context"))} line 1 is not the shared init directive`,
    );
  }
  for (const diagram of DIAGRAMS) {
    if (firstLineOf(diagram.id) !== sharedInit) {
      fail(
        `${relativePath(mmdPath(diagram.id))} line 1 differs from D1-system-context.mmd — every diagram must share one theme block`,
      );
    }
  }

  // A file with no classDef lines is exempt: D3 is a sequence diagram, where the directive has
  // nothing to apply to. A file that declares any must declare D1's set exactly.
  const sharedClassDefs = classDefsOf("D1-system-context").join("\n");
  for (const diagram of DIAGRAMS) {
    const own = classDefsOf(diagram.id);
    if (own.length && own.join("\n") !== sharedClassDefs) {
      fail(
        `${relativePath(mmdPath(diagram.id))} classDef block differs from D1-system-context.mmd — every diagram must share one palette`,
      );
    }
  }

  for (const diagram of DIAGRAMS) {
    const source = readFileSync(mmdPath(diagram.id), "utf8");
    for (const sentinel of diagram.mustContain) {
      if (!source.includes(sentinel)) {
        fail(
          `${relativePath(mmdPath(diagram.id))} no longer contains ${JSON.stringify(sentinel)}`,
        );
      }
    }
  }

  if (!existsSync(manifestPath)) fail(stale(manifestPath));
  if (readFileSync(manifestPath, "utf8") !== buildManifest())
    fail(stale(manifestPath));

  if (!existsSync(sourcesPath)) fail(stale(sourcesPath));
  if (readFileSync(sourcesPath, "utf8") !== buildSources())
    fail(stale(sourcesPath));
}

// Parses before either path: --check must not pass a broken source, and a build must not write
// a manifest over one.
await parseAll();

if (CHECK) {
  runCheck();
  console.log(`${DIAGRAMS.length} diagrams verified`);
} else {
  writeFileSync(manifestPath, buildManifest(), "utf8");
  writeFileSync(sourcesPath, buildSources(), "utf8");
  console.log(
    `wrote the manifest and SOURCES.md for ${DIAGRAMS.length} diagrams`,
  );
}
