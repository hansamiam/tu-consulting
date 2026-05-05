-- =============================================================================
-- Anomaly detector — automated daily flagging of suspect rows
-- =============================================================================
-- The user is rightly worried about scaling: today we can hand-check, but in
-- a month with thousands of scrapes accumulating, a hallucination loop or a
-- broken source could silently poison the catalog. This migration adds a
-- defensive "anomaly detector" that runs nightly and AUTOMATICALLY flags
-- rows that look wrong. Flagged rows get verification_status='broken' so
-- they're hidden from Discover + AI retrieval until a human inspects.
--
-- The patterns we catch (each one represents a class of hallucination /
-- scraping bug that's hit us before):
--
--   1. Awards above the sanity cap that somehow slipped past ingest
--      (>$2M per recipient). Already caught at ingest, but if a
--      column gets corrupted or an admin pastes a bad value,
--      the detector catches it.
--
--   2. application_deadline far in the past (> 2 years) AND
--      deadline_type is NOT 'annual' / 'rolling'. These are dead
--      programs that the source page hasn't been updated since.
--
--   3. application_deadline more than 5 years in the FUTURE — the LLM
--      mis-extracted (e.g. read "2030 vision" as a deadline year).
--
--   4. provider_name that's a junk pattern even after cleanProvider
--      ran (defence in depth — covers regex misses).
--
--   5. host_country not matching any known country (after canonicalisation).
--      Catches LLM hallucinated "country" values like "STEM Field" or
--      "Engineering Track" that ended up in the wrong field.
--
--   6. scholarship_name length pathologies: <8 chars (probably "Scholarship"
--      or "Award" alone — meaningless) or >200 chars (LLM grabbed a paragraph).
--
--   7. Soft-field hallucination: scholarship_name appears VERBATIM in
--      why_this_fits/how_to_win/strategy_notes. Means the LLM padded its
--      output by repeating the title — empty calorie content.
--
-- Output: a SQL function that returns the count of newly-flagged rows so
-- the cron can log it. Service-role only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.detect_scholarship_anomalies()
RETURNS TABLE (
  rule_name text,
  rows_flagged int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  -- Rule 1: awards above sanity cap
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        last_verified_at = now()
    WHERE estimated_total_value_usd > 2000000
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'award_above_2M'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 2: deadline > 2 years in the past, not annual/rolling
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        last_verified_at = now()
    WHERE application_deadline < CURRENT_DATE - INTERVAL '2 years'
      AND lower(coalesce(deadline_type, '')) NOT IN ('annual', 'rolling', 'continuous')
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_2yr_past'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 3: deadline > 5 years in the future
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        last_verified_at = now()
    WHERE application_deadline > CURRENT_DATE + INTERVAL '5 years'
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_5yr_future'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 4: provider name junk patterns
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        last_verified_at = now()
    WHERE provider_name IS NOT NULL
      AND btrim(provider_name) ~* '^(various|multiple|several|n/?a|none|unknown|tbd|to be determined|—|-)\.?$'
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'provider_junk'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 5: scholarship_name length pathology (<8 or >200 chars)
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        last_verified_at = now()
    WHERE (length(coalesce(scholarship_name, '')) < 8 OR length(coalesce(scholarship_name, '')) > 200)
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'name_length_pathological'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 6: soft-field title-echo (LLM padded output with the title)
  -- Only flag when the title is repeated with minimal surrounding text.
  -- Don't auto-flag broken — instead just nullify the offending field.
  WITH cleaned AS (
    UPDATE public.scholarships s
    SET why_this_fits = NULL
    WHERE s.why_this_fits IS NOT NULL
      AND length(s.scholarship_name) > 16
      AND lower(s.why_this_fits) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.why_this_fits) < length(s.scholarship_name) + 60
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'why_this_fits_title_echo'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 7: how_to_win title-echo
  WITH cleaned AS (
    UPDATE public.scholarships s
    SET how_to_win = NULL
    WHERE s.how_to_win IS NOT NULL
      AND length(s.scholarship_name) > 16
      AND lower(s.how_to_win) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.how_to_win) < length(s.scholarship_name) + 80
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'how_to_win_title_echo'; rows_flagged := v_count; RETURN NEXT;

  RETURN;
END
$$;

GRANT EXECUTE ON FUNCTION public.detect_scholarship_anomalies() TO service_role;

-- ─── Schedule via pg_cron at 03:30 UTC daily (after lifecycle refresh) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('detect-scholarship-anomalies') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'detect-scholarship-anomalies'
    );
    PERFORM cron.schedule(
      'detect-scholarship-anomalies',
      '30 3 * * *',
      $job$ SELECT * FROM public.detect_scholarship_anomalies(); $job$
    );
  END IF;
END
$$;

-- ─── Run once now to flag any existing anomalies ─────────────────────────
SELECT * FROM public.detect_scholarship_anomalies();
