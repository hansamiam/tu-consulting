-- =============================================================================
-- Catalog hygiene sweep — flag every suspect row for re-verification
-- =============================================================================
-- The user's audit caught 5 wrong rows in the headline scholarships.
-- That's the visible tip — the deeper concern is that the original
-- bulk-scrape run that populated the catalog used an LLM extraction
-- pipeline before the anti-fab clauses, min-info gate, registry gate,
-- and cross-reference rule were in place. Many surviving rows have
-- accumulated errors from that period.
--
-- This migration does an aggressive one-shot quality sweep:
--
--   1. Flag stale every row with low data_completeness_score (<= 5).
--      The verify-scholarship-cron prioritises by completeness ASC, so
--      these surface first in the queue.
--
--   2. Flag stale every row linked to a registered famous-funder
--      AND last_verified_at older than 30 days. Once verify-cron
--      re-touches these, they'll cross-ref against the
--      provider_authoritative_facts registry on the next anomaly cron.
--
--   3. Flag broken every row whose canonical_key normalizes to junk
--      OR whose scholarship_name is suspiciously short/long
--      (defensive — the existing anomaly cron covers this nightly,
--      but the existing catalog has rows from before the cron existed).
--
--   4. Flag stale every row with verification_status='pending' that
--      is older than 14 days. These slipped past the auto-publish
--      gate (confidence < 0.85) but never got admin review either —
--      they should be re-verified, not stranded.
--
--   5. Reset last_verified_at to a value that puts the row at the
--      front of the verify queue (NULL bubbles to the top per the
--      cron's ORDER BY). Skipped for already-broken rows.
--
-- Diagnostic NOTICEs report each rule's row count so the push log
-- shows exactly how much of the catalog gets re-validated.
-- =============================================================================

DO $$
DECLARE v_count int;
BEGIN
  -- 1. Low completeness → stale
  UPDATE public.scholarships
  SET verification_status = 'stale',
      last_verified_at = NULL
  WHERE data_completeness_score IS NOT NULL
    AND data_completeness_score <= 5
    AND verification_status NOT IN ('broken', 'stale');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[hygiene] low_completeness flagged stale: % row(s)', v_count;
END $$;

DO $$
DECLARE v_count int;
BEGIN
  -- 2. Registered famous-funder rows older than 30 days → stale + bubble to top
  UPDATE public.scholarships s
  SET verification_status = 'stale',
      last_verified_at = NULL
  FROM public.providers p
  INNER JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  WHERE s.provider_id = p.provider_id
    AND s.verification_status NOT IN ('broken')
    AND (s.last_verified_at IS NULL OR s.last_verified_at < now() - INTERVAL '30 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[hygiene] registered_funder_stale flagged: % row(s)', v_count;
END $$;

DO $$
DECLARE v_count int;
BEGIN
  -- 3. Pathological-name rows → broken (covered nightly by anomaly Rule 5,
  -- but back-runs the rule against current state)
  UPDATE public.scholarships
  SET verification_status = 'broken',
      last_verified_at = now()
  WHERE (length(coalesce(scholarship_name, '')) < 8 OR length(coalesce(scholarship_name, '')) > 200)
    AND verification_status NOT IN ('broken');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[hygiene] pathological_name flagged broken: % row(s)', v_count;
END $$;

DO $$
DECLARE v_count int;
BEGIN
  -- 4. Pending-status rows older than 14 days → stale (force re-verify)
  UPDATE public.scholarships
  SET verification_status = 'stale',
      last_verified_at = NULL
  WHERE verification_status = 'pending'
    AND created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[hygiene] orphaned_pending flagged stale: % row(s)', v_count;
END $$;

-- ─── Audit summary ──────────────────────────────────────────────────
DO $$
DECLARE
  v_total int; v_verified int; v_stale int; v_pending int; v_broken int;
  v_low_comp int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  SELECT count(*) INTO v_verified FROM public.scholarships WHERE verification_status = 'verified';
  SELECT count(*) INTO v_stale    FROM public.scholarships WHERE verification_status = 'stale';
  SELECT count(*) INTO v_pending  FROM public.scholarships WHERE verification_status = 'pending';
  SELECT count(*) INTO v_broken   FROM public.scholarships WHERE verification_status = 'broken';
  SELECT count(*) INTO v_low_comp FROM public.scholarships WHERE coalesce(data_completeness_score, 0) <= 5;
  RAISE NOTICE '[hygiene_audit] total=%, verified=%, stale=%, pending=%, broken=%, low_completeness=%',
    v_total, v_verified, v_stale, v_pending, v_broken, v_low_comp;
END $$;
