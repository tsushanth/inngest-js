import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    roots: ["./src"],
    exclude: ["**/node_modules/**", "src/test/integration/**"],
  },
});
