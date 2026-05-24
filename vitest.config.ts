/**
 * Vitest config — kept separate from vite.config.ts so the test
 * runner skips the lovable-tagger plugin and the manualChunks
 * rollup config (neither matters for unit tests, and lovable-tagger
 * specifically only runs in development mode).
 *
 * Tests live next to the code they cover under `__tests__/`
 * directories. Currently: src/components/brief/sections/__tests__/.
 *
 * jsdom environment + @testing-library/jest-dom matchers wired in
 * via vitest.setup.ts so `toBeInTheDocument()` works.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Only run tests under src/ — keep edge-function Deno code out of the
    // Vitest pass (it imports from https:// URLs that Vitest can't resolve).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
