import { defineConfig } from "vitest/config";
import path from "path";

// Scoped to the main app's own src/ tree, and only to actual Vitest-style
// tests (.test.ts / .test.tsx). packages/cli uses Node's built-in test
// runner via tsx instead (see packages/cli/package.json), so it's excluded
// here to avoid two runners fighting over the same files.
export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "packages/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
