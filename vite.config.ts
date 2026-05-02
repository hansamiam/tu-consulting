import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    /* Manual vendor chunking pulls heavy third-party libs out of the
       app's main chunk. Browsers cache vendor chunks long-term across
       deploys (the hash only changes when the lib version bumps), so
       repeat visits skip the largest downloads. Combined with the
       per-route React.lazy splits in App.tsx, the cold-load path now
       fetches just the framework + one route, not the entire app. */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // React + react-dom + scheduler — the framework runtime.
          // Use node_modules/<pkg>/ prefix so we don't accidentally match
          // packages like @floating-ui/react-dom (which embed React in
          // their path and would otherwise pull Floating UI into the
          // react-vendor chunk, scrambling its exports and breaking
          // every consumer that imports React from this chunk).
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          // Routing
          if (id.includes("react-router")) return "react-router";
          // Supabase + isows + auth-helpers
          if (id.includes("@supabase") || id.includes("isows")) return "supabase-vendor";
          // Stripe — only loaded on the Pricing/checkout path; keep separate
          if (id.includes("@stripe") || id.includes("/stripe-js")) return "stripe-vendor";
          // Animation library — used everywhere, but big
          if (id.includes("framer-motion")) return "motion-vendor";
          // Radix UI primitives + shadcn — split as a single bucket
          if (id.includes("@radix-ui")) return "radix-vendor";
          // Markdown rendering (used on brief, AI report, essay critique)
          if (id.includes("react-markdown") || id.includes("/remark") || id.includes("/rehype") ||
              id.includes("/mdast") || id.includes("/micromark") || id.includes("/unified")) {
            return "markdown-vendor";
          }
          // Date / time
          if (id.includes("date-fns")) return "date-vendor";
          // Lucide icons (most heavy in main without splitting)
          if (id.includes("lucide-react")) return "icons-vendor";
          // Recharts — heavy charting lib, only used on admin pages.
          // Splitting it keeps the vendor chunk lean for non-admin visitors.
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          // Default: everything else node_modules → grouped vendor
          return "vendor";
        },
      },
    },
    // Bump the warning threshold — we're consciously sizing chunks
    chunkSizeWarningLimit: 700,
  },
}));
