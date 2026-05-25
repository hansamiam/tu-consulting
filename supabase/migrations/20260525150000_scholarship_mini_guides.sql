-- =============================================================================
-- Pre-generated static mini-guides per scholarship
-- =============================================================================
-- Replaces the per-profile scholarship-deep-dive (Gemini Flash, cached on
-- profile_hash) for Discover's "personalized for you" surface. Decision
-- recorded 2026-05-25 in project_topuni_deep_dive_decisions_2026_05_25.md:
-- the real driver wasn't cost — it was the Commonwealth-Kazakhstan
-- eligibility-hallucination class. Static mini-guides are deterministic,
-- reviewable, generated offline via Claude Code subscription (no API per
-- view), and don't carry the per-profile hallucination risk.
--
-- One row per scholarship. Content is GENERIC to the scholarship — it
-- doesn't read the visitor's profile. Renamed surface in the UI from
-- "Personalized for you" to "How this scholarship plays" to match.
--
-- The per-profile deep-dive function (scholarship-deep-dive) and its
-- cache table (scholarship_deep_dives) stay alive — they'll be revived
-- as a member-only feature once we have eligibility-gating discipline
-- across the catalog.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scholarship_mini_guides (
  scholarship_id  uuid         PRIMARY KEY REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  content         jsonb        NOT NULL,
  -- Bump when the content shape evolves so stale rows can be
  -- regenerated rather than served against a newer component.
  schema_version  smallint     NOT NULL DEFAULT 1,
  generated_at    timestamptz  NOT NULL DEFAULT now(),
  -- Provenance — claude-code-subscription / openai-batch / etc.
  source          text         NOT NULL DEFAULT 'claude-code-subscription',
  -- Author note for human-review trail. Free text.
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_mini_guides_generated
  ON public.scholarship_mini_guides(generated_at);

ALTER TABLE public.scholarship_mini_guides ENABLE ROW LEVEL SECURITY;

-- Mini-guides are brand content, not user data. Public SELECT is fine —
-- they're served to anon + signed-in users alike from Discover.
CREATE POLICY "Public reads mini-guides"
  ON public.scholarship_mini_guides
  FOR SELECT
  USING (true);

-- Service role manages writes — generation runs offline, not via the
-- in-browser app, so no end-user INSERT path is needed.
CREATE POLICY "Service role manages mini-guides"
  ON public.scholarship_mini_guides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
