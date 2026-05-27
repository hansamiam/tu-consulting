/**
 * Centralised, validated access to Vite build-time env vars.
 *
 * Import `ENV` / `EDGE_FUNCTIONS_URL` from here instead of reading
 * `import.meta.env.VITE_*` directly — it keeps the unsafe `as string`
 * casts in one place and fails loudly at startup if a required var is
 * missing, rather than producing `undefined`-in-a-URL bugs at runtime.
 *
 * Whitespace is stripped for the same reason as in the Supabase client:
 * pasting long keys into a hosting provider's UI can introduce stray
 * line breaks.
 */
const required = (key: string, value: string | undefined): string => {
  const v = value?.replace(/\s+/g, "");
  if (!v) {
    throw new Error(`Missing required env var ${key} — set it in .env / .env.local`);
  }
  return v;
};

export const ENV = {
  SUPABASE_URL: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_PUBLISHABLE_KEY: required(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  /** Stripe publishable key (pk_live_… / pk_test_…). Optional — when
   *  unset, /pricing falls back to the legacy redirect-mode checkout. */
  STRIPE_PUBLISHABLE_KEY:
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.replace(/\s+/g, "") || "",
} as const;

/** Base URL for Supabase Edge Functions — e.g. `${EDGE_FUNCTIONS_URL}/topuni-chat`. */
export const EDGE_FUNCTIONS_URL = `${ENV.SUPABASE_URL}/functions/v1`;
