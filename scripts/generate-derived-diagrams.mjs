import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const srcDir = resolve(root, "src");
const libDir = resolve(srcDir, "lib");
const apiDir = resolve(srcDir, "api");
const diagramsDir = resolve(root, "docs", "diagrams");
const CHECK = process.argv.includes("--check");

const d5Path = resolve(diagramsDir, "D5-module-map.mmd");

const styleSource = readFileSync(
  resolve(diagramsDir, "D1-system-context.mmd"),
  "utf8",
).split("\n");
const INIT_LINE = styleSource[0];
const CLASSDEF_BLOCK = styleSource.filter((line) =>
  line.startsWith("classDef "),
);

if (!INIT_LINE.startsWith("%%{init:")) {
  console.error(
    "docs/diagrams/D1-system-context.mmd line 1 is not the shared init line; cannot derive a style from it",
  );
  process.exit(1);
}
if (CLASSDEF_BLOCK.length !== 7) {
  console.error(
    `expected 7 classDef lines in D1-system-context.mmd, found ${CLASSDEF_BLOCK.length}`,
  );
  process.exit(1);
}

const GROUPS = [
  {
    title: "Route handlers",
    members: [
      ["api/index.ts", "apiRouter", "ours"],
      ["api/leads.ts", "leadsRoute", "ours"],
      ["api/soa.ts", "soaRoute", "ours"],
      ["api/do-not-contact.ts", "dncRoute", "ours"],
      ["api/jobs-outbox.ts", "jobsRoute", "ours"],
      ["api/health.ts", "healthRoute", "ours"],
    ],
  },
  {
    title: "Request safety",
    members: [
      ["lib/security/turnstile.ts", "turnstile", "guard"],
      ["lib/security/request.ts", "request", "guard"],
    ],
  },
  {
    title: "Lead pipeline",
    members: [
      ["lib/leads/service.ts", "leadService", "ours"],
      ["lib/leads/schema.ts", "leadSchema", "ours"],
      ["lib/leads/outbox.ts", "outbox", "ours"],
    ],
  },
  {
    title: "Compliance",
    members: [
      ["lib/compliance/disclosures.ts", "disclosures", "ours"],
      ["lib/compliance/suppression.ts", "suppression", "guard"],
      ["lib/compliance/phone.ts", "phone", "ours"],
      ["lib/compliance/dnc.ts", "dnc", "ours"],
      ["lib/compliance/dnc-schema.ts", "dncSchema", "ours"],
      ["lib/compliance/soa.ts", "soa", "ours"],
      ["lib/compliance/soa-schema.ts", "soaSchema", "ours"],
    ],
  },
  {
    title: "CRM delivery",
    members: [
      ["lib/crm/index.ts", "crm", "ours"],
      ["lib/crm/types.ts", "crmTypes", "ours"],
      ["lib/crm/transports/webhook.ts", "webhook", "vendor"],
      ["lib/crm/transports/zapier.ts", "zapier", "vendor"],
      ["lib/crm/transports/mock.ts", "mock", "vendor"],
    ],
  },
  {
    title: "Storage and content",
    members: [
      ["lib/db/index.ts", "db", "artifact"],
      ["lib/db/schema.ts", "dbSchema", "phi"],
      ["lib/media.ts", "media", "artifact"],
      ["lib/image-loader.ts", "imageLoader", "artifact"],
    ],
  },
  {
    title: "Outbound and configuration",
    members: [
      ["lib/email/index.ts", "email", "vendor"],
      ["lib/env.ts", "env", "artifact"],
      ["lib/site-url.ts", "siteUrl", "artifact"],
      ["lib/ics.ts", "ics", "artifact"],
      ["lib/business.ts", "business", "artifact"],
      ["lib/announcement.ts", "announcement", "artifact"],
      ["lib/motion.ts", "motion", "artifact"],
      ["lib/effects-pause.ts", "effectsPause", "ours"],
      ["lib/webgl-registry.ts", "webglRegistry", "ours"],
      ["lib/portrait-points.ts", "portraitPoints", "ours"],
      ["lib/signal-field.ts", "signalField", "ours"],
      ["lib/random.ts", "random", "ours"],
      ["lib/utils.ts", "utils", "ours"],
    ],
  },
];

const declared = new Map();
for (const group of GROUPS) {
  for (const [path, id, klass] of group.members) {
    if (declared.has(path)) {
      console.error(`${path} is declared twice in GROUPS`);
      process.exit(1);
    }
    declared.set(path, { id, klass, group: group.title });
  }
}

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry) || /\.int\.test\.tsx?$/.test(entry))
      continue;
    found.push(relative(srcDir, full));
  }
  return found;
}

const onDisk = [...walk(libDir), ...walk(apiDir)].sort();

const missing = onDisk.filter((path) => !declared.has(path));
const phantom = [...declared.keys()].filter(
  (path) => !existsSync(resolve(srcDir, path)),
);

if (missing.length || phantom.length) {
  for (const path of missing) {
    console.error(
      `src/${path} exists but is not declared in GROUPS — add it to a group and re-run`,
    );
  }
  for (const path of phantom) {
    console.error(
      `GROUPS declares src/${path}, which does not exist — remove it or fix the path`,
    );
  }
  console.error(
    "the module map cannot be derived while it disagrees with the tree",
  );
  process.exit(1);
}

const SPECIFIER =
  /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g;

const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveSpecifier(fromPath, specifier) {
  let target;
  if (specifier.startsWith("@/")) {
    target = specifier.slice(2);
  } else if (specifier.startsWith(".")) {
    const dir = resolve(srcDir, fromPath, "..");
    target = relative(srcDir, resolve(dir, specifier));
  } else {
    return null;
  }

  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${target}${suffix}`;
    if (declared.has(candidate)) return candidate;
  }
  return null;
}

const edges = [];
for (const path of onDisk) {
  const source = readFileSync(resolve(srcDir, path), "utf8");
  const seen = new Set();
  for (const match of source.matchAll(SPECIFIER)) {
    const target = resolveSpecifier(path, match[1]);
    if (!target || target === path || seen.has(target)) continue;
    seen.add(target);
    edges.push([path, target]);
  }
}

edges.sort((a, b) => {
  const left = `${declared.get(a[0]).id}->${declared.get(a[1]).id}`;
  const right = `${declared.get(b[0]).id}->${declared.get(b[1]).id}`;
  return left < right ? -1 : left > right ? 1 : 0;
});

function buildD5() {
  const lines = [
    INIT_LINE,
    "flowchart LR",
    "accTitle: Every server module this repository owns, and what each one imports",
    "accDescr {",
    "  A left-to-right map of the server side of the application, derived from the imports in the",
    "  code rather than drawn by hand, so it cannot describe a wiring that no longer exists. Each",
    "  box is one module; each arrow is one module importing another. Route handlers sit on the",
    "  left, since every request enters through one of them. The two modules that verify a request",
    "  and the one that decides whether a person may be contacted are drawn as gates, because their",
    "  job is to reject. The database schema is drawn as regulated data, because that is what it",
    "  declares. Test files are excluded: a test importing a module says nothing about how the",
    `  application is wired. ${onDisk.length} modules and ${edges.length} imports are drawn.`,
    "}",
    "",
  ];

  for (const group of GROUPS) {
    lines.push(
      `subgraph ${group.title.replace(/\W+/g, "")} ["${group.title}"]`,
    );
    for (const [path, id] of group.members) {
      const label = path.startsWith("api/")
        ? path.slice("api/".length)
        : path.slice("lib/".length);
      lines.push(`  ${id}["${label}"]`);
    }
    lines.push("end", "");
  }

  for (const [from, to] of edges) {
    lines.push(`${declared.get(from).id} --> ${declared.get(to).id}`);
  }

  lines.push("", ...CLASSDEF_BLOCK, "");

  const byClass = new Map();
  for (const { id, klass } of declared.values()) {
    if (!byClass.has(klass)) byClass.set(klass, []);
    byClass.get(klass).push(id);
  }
  for (const klass of [
    "human",
    "client",
    "ours",
    "guard",
    "vendor",
    "phi",
    "artifact",
  ]) {
    const ids = byClass.get(klass);
    if (ids?.length) lines.push(`class ${ids.join(",")} ${klass}`);
  }

  return `${lines.join("\n")}\n`;
}

const rendered = buildD5();

if (CHECK) {
  const committed = existsSync(d5Path) ? readFileSync(d5Path, "utf8") : "";
  if (committed !== rendered) {
    console.error(
      "docs/diagrams/D5-module-map.mmd no longer matches the imports in src/ — run: node scripts/generate-derived-diagrams.mjs",
    );
    process.exit(1);
  }
  console.log(`D5 verified: ${onDisk.length} modules, ${edges.length} imports`);
} else {
  writeFileSync(d5Path, rendered, "utf8");
  console.log(
    `wrote docs/diagrams/D5-module-map.mmd: ${onDisk.length} modules, ${edges.length} imports`,
  );
}
