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
          return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
        })
        .filter(([key]) => key),
    );
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    environment: "node",
    env: readDotEnv(),
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Specs share one database; running files in parallel would interleave
    // outbox rows between them.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
