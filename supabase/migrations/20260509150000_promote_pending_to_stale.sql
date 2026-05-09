-- =============================================================================
-- Bulk promote pending → stale — force re-verification of the catalog
-- =============================================================================
-- Audit (20260509140000) revealed 145/213 rows (68%) sitting in
-- `pending` status. Pending = extracted by LLM but didn't clear the
-- 0.85 auto-publish confidence threshold; never reviewed by admin
-- either. They show up in public Discover (the read-side filter
-- includes pending) but the data quality is uneven. This is the
-- "fundamental initial scraping job was awful" symptom the user
-- flagged.
--
-- Fix: bulk-promote every pending row to `stale`. The verify-cron
-- prioritises by completeness ASC NULLS FIRST + last_verified_at
-- ASC, so flipping to stale + nulling last_verified_at puts these
-- rows at the front of the queue. As they get re-touched:
--   * Confident extractions promote to 'verified'
--   * Material drift stages diffs for admin review
--   * Unreachable URLs get flagged via consecutive-fail tracker
--   * Cross-ref rule + registry gate enforce ground-truth checks
--
-- Cost: each verify-scholarship invocation is ~$0.001 (Firecrawl) +
-- ~$0.002 (LLM). 145 rows ≈ $0.45 over the next ~5 days as the
-- cron drains them at 100 rows/day. Acceptable.
--
-- Idempotent: only flips status + clears last_verified_at; safe to
-- re-run. Won't touch already-broken rows.
-- =============================================================================

DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET verification_status = 'stale',
      last_verified_at = NULL
  WHERE verification_status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[bulk_reverify] pending → stale: % row(s) queued for re-verification', v_count;
END $$;

-- Audit summary after the flip
DO $$
DECLARE
  v_total int; v_verified int; v_stale int; v_pending int; v_broken int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  SELECT count(*) INTO v_verified FROM public.scholarships WHERE verification_status = 'verified';
  SELECT count(*) INTO v_stale    FROM public.scholarships WHERE verification_status = 'stale';
  SELECT count(*) INTO v_pending  FROM public.scholarships WHERE verification_status = 'pending';
  SELECT count(*) INTO v_broken   FROM public.scholarships WHERE verification_status = 'broken';
  RAISE NOTICE '[reverify_audit] total=%, verified=%, stale=%, pending=%, broken=%',
    v_total, v_verified, v_stale, v_pending, v_broken;
END $$;
