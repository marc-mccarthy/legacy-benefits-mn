import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
};

const domTests = [
  "tests/components/blocks/render-blocks.test.tsx",
  "tests/components/motion/lit-words.test.tsx",
  "tests/components/motion/magnetic.test.tsx",
  "tests/components/motion/page-transition.test.tsx",
  "tests/components/motion/three-stage.test.tsx",
  "tests/components/motion/use-visual-effect-lifecycle.test.tsx",
  "tests/components/sections/lake-sequence.test.tsx",
  "tests/components/sections/plain-motion.test.tsx",
  "tests/components/sections/signal-portrait.test.tsx",
  "tests/lib/effects-pause.test.ts",
];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["**/*.int.test.ts", "**/node_modules/**", ...domTests],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "unit-dom",
          environment: "jsdom",
          include: domTests,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/**/*.int.test.ts"],
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: [
        ["text", { skipFull: false }],
        ["html", {}],
        ["lcov", {}],
        ["json-summary", {}],
      ],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.int.test.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 33,
        statements: 33,
        functions: 24,
        branches: 31,
        "src/api/**": {
          lines: 100,
          statements: 98,
          functions: 100,
          branches: 84,
        },
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
