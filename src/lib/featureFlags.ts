// Feature flags read from build-time env vars. Used to gate the new
// digital-products catalog behind a preview-only flag while Samuel
// reviews each surface before public release.
//
// To enable in dev: VITE_RESOURCES_VISIBLE=true bun run dev
// To enable on Vercel preview: set the env var in the preview-only
// environment (not production) until the catalog is signed off.

/**
 * Whether the /resources catalog + product pages are publicly
 * surfaced (nav link visible, no preview banner). When false:
 * - Navigation Resources link hidden
 * - Each product page shows a small "PREVIEW ONLY" banner at the top
 * - Direct URLs still resolve so Samuel can review each surface
 *
 * Default: false. Flip to "true" once the catalog is signed off.
 */
export const RESOURCES_VISIBLE: boolean =
  (import.meta.env.VITE_RESOURCES_VISIBLE ?? "").toString().toLowerCase() === "true";
