#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const MAX_PACKAGE_BYTES = 209_715_200;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "api-bundle");
const entry = join(repoRoot, "src", "api", "index.ts");

// `pg` reaches for its native binding behind a try/catch and falls back to the
// JavaScript client; bundling it would turn that miss into a build error.
const EXTERNAL = ["pg-native", "cloudflare:sockets"];

/**
 * `server-only` throws on import unless a React Server Component loaded it.
 * The Lambda has no React runtime, so the marker is resolved to an empty
 * module — the guarantee it encodes, that these modules never reach a browser,
 * is already true of a bundle whose only entrypoint is the Lambda handler.
 */
const serverOnlyShim = {
  name: "server-only-shim",
  setup(build) {
    build.onResolve({ filter: /^(server-only|client-only)$/ }, (args) => ({
      path: args.path,
      namespace: "empty-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "empty-shim" }, () => ({
      contents: "",
      loader: "js",
    }));
  },
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [entry],
  outfile: join(outDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: EXTERNAL,
  sourcemap: false,
  minify: false,
  legalComments: "none",
  logLevel: "silent",
  banner: {
    // Bundled CJS dependencies expect these; ESM does not define them.
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import { dirname as __dirname_ } from 'node:path';",
      "const require = __createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      "const __dirname = __dirname_(__filename);",
    ].join("\n"),
  },
  metafile: true,
  plugins: [serverOnlyShim],
});

for (const message of result.warnings) {
  process.stderr.write(`build-api-bundle: ${message.text}\n`);
}

writeFileSync(
  join(outDir, "package.json"),
  `${JSON.stringify({ name: "api-bundle", private: true, type: "module", main: "index.mjs" }, null, 2)}\n`,
);

function directorySize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? directorySize(path) : statSync(path).size;
  }
  return total;
}

const bytes = directorySize(outDir);

// The bundle is one file plus its manifest, so a directory named in the spec's
// exclusion list can only appear as an inlined module path.
const inlined = Object.keys(
  result.metafile.outputs[Object.keys(result.metafile.outputs)[0]].inputs ?? {},
);
// `src/content/site.ts` and the types it names are the one exception:
// `getBusinessIdentity` falls back to them, and the lead route needs it for the
// notification list and the stored consent text.
const CONTENT_ALLOWED = /^src\/content\/(site|types)\.ts$/;
const forbidden = inlined.filter(
  (path) =>
    /^src\/(content|components|app)\//.test(path) &&
    !CONTENT_ALLOWED.test(path),
);

process.stdout.write(`api-bundle: ${bytes} bytes\n`);
process.stdout.write(`api-bundle: ${inlined.length} modules inlined\n`);

if (forbidden.length > 0) {
  for (const path of forbidden) {
    process.stderr.write(
      `api-bundle: site module reached the bundle — ${path}\n`,
    );
  }
  process.exit(1);
}

if (bytes >= MAX_PACKAGE_BYTES) {
  process.stderr.write("::error::api bundle exceeds the guard\n");
  process.exit(1);
}

// Proves the entrypoint loads and exports `handler` under the Node version the
// Lambda runs, rather than only that esbuild wrote a file.
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `const m = await import(${JSON.stringify(join(outDir, "index.mjs"))});
     if (typeof m.handler !== "function") { console.error("api-bundle: no handler export"); process.exit(1); }`,
  ],
  { stdio: "inherit" },
);

process.stdout.write("api-bundle: ok\n");
