-- Recommender tracking on application_tracker
--
-- Every serious scholarship requires 2–3 letters of recommendation;
-- the most common reason a strong candidate misses a deadline isn't
-- ineligibility, it's a recommender who promised but never submitted.
-- TopUni had zero infrastructure for this. This migration adds the
-- column the Pipeline detail sheet needs so members can track who
-- they asked, who agreed, and who actually submitted.
--
-- Stored as JSONB rather than a normalized recommenders table because:
--   1. The shape is per-application — Stanford might need 2 letters,
--      Schwarzman needs 3 from specific role types. Per-row state.
--   2. We'd otherwise need a join + a UNIQUE constraint per
--      (user, scholarship, recommender_name) which clutters the schema
--      for no analytical benefit (we don't aggregate across recommenders).
--   3. Keeps the existing application_tracker hot-path query fast —
--      no second SELECT.
--
-- Shape (JSON array, validated client-side):
--   [{ "name": "Prof. Lee", "email": "lee@…", "status": "asked"|"agreed"|"submitted",
--      "asked_at": "2026-…", "submitted_at": "2026-…" }]
--
-- The hook (useApplicationTracker) feature-detects this column and
-- falls back to localStorage-only when missing, so client code stays
-- safe pre- and post-migration.

ALTER TABLE public.application_tracker
  ADD COLUMN IF NOT EXISTS recommenders jsonb;
