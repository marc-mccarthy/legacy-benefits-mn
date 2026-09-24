import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

// Integration specs talk to the local Postgres, so .env must be loaded the
// same way `next dev` loads it. Parsed directly to avoid depending on vite's
// loadEnv, which pnpm does not hoist into this package.
function readDotEnv(): Record<string, string> {
  try {
    const raw = readFileSync(new URL("./.env", import.meta.url), "utf8");
    return Object.fromEntries(
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const eq = line.indexOf("=");
          const key = line.slice(0, eq).trim();
          let value = line.slice(eq + 1).trim();

          // Strip one layer of matching quotes, which is what dotenv — and so
          // `next dev` — does. Without this the value keeps its quote
          // characters, and since .env.example quotes several values by
          // convention (BUSINESS_NAME="Example Benefits"), the failure is easy
          // to hit and impossible to read: DATABASE_URL arrives as
          // '"postgres://..."', every integration spec dies on its opening
          // TRUNCATE, and the app itself is fine because Next parses the same
          // file correctly. The comment above promises .env is loaded "the same
          // way next dev loads it" — this is the part that was missing.
          if (value.length >= 2) {
            const first = value[0];
            if ((first === '"' || first === "'") && value.endsWith(first)) {
              value = value.slice(1, -1);
            }
          }
          return [key, value];
        })
        .filter(([key]) => key),
    );
  } catch {
    return {};
  }
}

// Mirrors the `paths` in tsconfig.json.
const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          // *.int.test.ts also matches *.test.ts, so it must be excluded here
          // or the DB specs would run in the unit project too.
          exclude: ["**/*.int.test.ts", "**/node_modules/**"],
          // Deliberately no `env: readDotEnv()`. .env sets a real
          // TURNSTILE_SECRET and CRM_TRANSPORT, which would silently change
          // what verifyTurnstile and getCrmTransport do under test. Unit specs
          // stub what they need with vi.stubEnv instead.
          //
          // Do NOT set `isolate: false` here, despite vitest suggesting it for
          // the ~370ms it would save. Without isolation the module registry is
          // shared between test files, and several specs mock the same module
          // with different shapes on purpose: @/lib/db is stubbed with only the
          // tables each spec needs, and drizzle-orm is stubbed as {eq, sql} in
          // outbox.test.ts but {eq, or} in suppression.test.ts. Whichever file
          // loads first wins, so suppression.ts sees an undefined
          // schema.dncRequests and 46 tests fail.
          //
          // It reproduces on 4 of 8 shuffle seeds under --maxWorkers=1 and
          // hides completely at the default worker count, because conflicting
          // files land in separate workers. That is the worst kind of flake:
          // green locally, intermittent in CI, and capable of letting a leaked
          // mock make a compliance test pass when it should fail.
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          env: readDotEnv(),
          include: ["src/**/*.int.test.ts"],
          // Specs share one database; running files in parallel would
          // interleave outbox rows between them.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: [
        // skipFull is pinned because vitest flips it to true when it detects
        // it is running under a coding agent, which hides the files that are
        // already at 100% — exactly the ones worth seeing.
        ["text", { skipFull: false }],
        ["html", {}],
        ["lcov", {}],
        ["json-summary", {}],
      ],
      reportsDirectory: "coverage",
      // Every file matching `include` is reported, not only the ones a spec
      // happened to import, so untested files show as 0% rather than
      // disappearing from the total. (Vitest 5 dropped the old `all` flag;
      // this is now the default behaviour of `include`.)
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.int.test.ts",
        "**/*.d.ts",
      ],
      /**
       * Ratchets, set to what the suite actually achieves today. They exist to
       * stop coverage sliding backwards, not to describe a target.
       *
       * The global numbers are low because React components and pages — which
       * Playwright covers end to end in e2e/ — are the bulk of the reported
       * lines and have no unit tests. Averaging them together would let a
       * regression in tested business logic hide behind untested rendering, so
       * the directories that hold the logic get their own bars below. A global
       * threshold still applies to every file, glob-matched ones included.
       *
       * Raising a number here after improving coverage is the intended
       * workflow. Lowering one should not happen without a reason in the
       * commit message.
       */
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 29,
        branches: 36,

        // Every route handler is fully covered; they are the write path for
        // leads, SOA records and opt-outs. The gap is index.ts, whose Lambda
        // event adapter has fallback branches no spec constructs an event for.
        "src/api/**": {
          lines: 100,
          statements: 98,
          functions: 100,
          branches: 84,
        },

        // Business logic, compliance and security. Every file here is at 100%
        // except src/lib/db/schema.ts, which is declarative drizzle table
        // definitions with nothing to assert — the migrations and the
        // integration spec are what prove those correct. That single file is
        // the whole gap between these numbers and 100.
        "src/lib/**": {
          lines: 98,
          statements: 98,
          functions: 92,
          branches: 100,
        },
      },
    },
  },
  resolve: { alias },
});
