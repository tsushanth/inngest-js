import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve `inngest` against the workspace package's built output so this test
// sees in-development features (e.g. `transformDeferInput`) that aren't in the
// last published version. Requires `pnpm build` in packages/inngest first.
const workspaceInngestDist = fileURLToPath(
  new URL("../inngest/dist", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      inngest: workspaceInngestDist,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/integration/**/*.test.ts"],
    globalSetup: ["./vitest.setup.integration.ts"],
    testTimeout: 60000,
    hookTimeout: 30000,
    silent: "passed-only",
    hideSkippedTests: true,
    typecheck: {
      enabled: true,
      include: ["src/test/integration/**/*.test.ts"],
      ignoreSourceErrors: true,
      tsconfig: "./tsconfig.integration.json",
    },
  },
});
