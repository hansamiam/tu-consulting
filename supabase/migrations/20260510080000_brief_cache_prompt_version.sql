-- =============================================================================
-- brief_cache — add prompt_version column + invalidate pre-consolidation rows
-- =============================================================================
-- Strategy report consolidated 2026-05-10 (commit a57bfe3): cut the
-- Career ROI / Visa / Monthly Budget / Final Word sections, tightened
-- shortlist + funding sections. Existing brief_cache rows still serve
-- the OLD 9-section layout to repeat visitors — defeats the consolidation.
--
-- Two changes:
--   1. Add prompt_version text column with default 'v2-2026-05-10'. All
--      future prompt changes bump this constant in the edge function so
--      cache hits require both a profile_hash match AND a prompt_version
--      match. Future consolidations no longer require a wipe migration.
--   2. Delete every existing row. They were all generated against the
--      pre-consolidation prompt and would re-render the cut sections on
--      cache hit. Cleaner than backdating them to "v1" and adding a
--      cache-bust check at lookup time.
--
-- Cost: a few cents of regen work as users come back. Repeat visits
-- after this migration regenerate ONCE against the new prompt and then
-- the v2-2026-05-10 cache holds.
-- =============================================================================

ALTER TABLE public.brief_cache
  ADD COLUMN IF NOT EXISTS prompt_version text NOT NULL DEFAULT 'v2-2026-05-10';

COMMENT ON COLUMN public.brief_cache.prompt_version IS
  'Snapshot id of the prompt template that produced this row. Edge function should write the current PROMPT_VERSION constant on insert and require a match on lookup. Bump the constant whenever the prompt structure changes (sections cut/added, validators changed) so old cached briefs are not served.';

-- Wipe every existing row — they were generated against the pre-v2
-- prompt that produced 9 sections (Career ROI / Visa / Monthly Budget /
-- Final Word among them). Serving those on cache hit would defeat the
-- consolidation.
DELETE FROM public.brief_cache;
