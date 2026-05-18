-- 2026-05-19: Fix verify-scholarship 500 wave.
--
-- Symptom: edge function logs showed ~50% of verify-scholarship
-- invocations returning HTTP 500 with body
--   { "error": "staging_insert_failed: null value in column \"source_id\"
--               of relation \"scholarships_staging\" violates not-null
--               constraint" }
--
-- Root cause: verify-scholarship's diff-staging path inserts into
-- scholarships_staging with source_id=NULL because there is no upstream
-- source row for a self-heal verify (it's a re-extract from the
-- scholarship's own official_url, not a fresh scrape from a hub source).
-- The function's code comment claimed "runtime is fine — the columns
-- are nullable in Postgres", but the schema actually had NOT NULL on
-- both source_id and fingerprint. So every diff that needed staging
-- silently 500'd — those scholarships would stay 'pending' or 'stale'
-- forever, with their material diffs (deadline changes, eligibility
-- updates, etc.) discarded.
--
-- Fix: drop NOT NULL on both source_id and fingerprint, matching the
-- function's existing assumption + the operational reality that
-- self-heal stages exist.
--
-- Verified post-fix: same scholarship that 500'd pre-fix now returns
-- {"status":"diffs_staged"} cleanly. Cron-driven verifies will start
-- catching up on the backlog of stale-but-undiffed rows on the next
-- 30-min tick.

ALTER TABLE public.scholarships_staging ALTER COLUMN source_id  DROP NOT NULL;
ALTER TABLE public.scholarships_staging ALTER COLUMN fingerprint DROP NOT NULL;
