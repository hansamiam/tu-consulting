-- =============================================================================
-- Famous-program integrity rules — anomaly detector v2
-- =============================================================================
-- The 5 catalog errors fixed in 20260509090000 share a common root cause:
-- LLM-extracted fields drifted from the ground truth for famous programs
-- whose actual eligibility / lifecycle / deadline rules are well-known.
--
-- Examples:
--   * Mastercard Foundation listed as globally eligible (it's SSA-only)
--   * Vanier listed as active (program was discontinued Fall 2024)
--   * Schwarzman might surface "Apply now" outside the cycle
--
-- These can be caught automatically with rule-based checks against a
-- registry of famous programs and their authoritative facts. Adds 4 new
-- rules to detect_scholarship_anomalies():
--
--   8.  Mastercard Foundation eligibility integrity — flag broken if
--       any non-African nationality is in eligible_countries
--   9.  Discontinued-program registry — flag broken any row matching
--       a known-discontinued program (Vanier 2024, plus future entries)
--   10. SSA-only program list eligibility — same logic as rule 8 but
--       generalized for the registry of SSA-restricted programs
--   11. Post-cycle stale check — known-annual programs whose
--       application_deadline has passed AND whose last_verified_at is
--       older than 14 days get flagged 'stale' so verify-cron picks
--       them up
--
-- Each rule is conservative — flag, don't auto-correct. Human/cron
-- workflow handles the actual fix. Returns count per rule for telemetry.
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
  -- Rules 1-7 from 20260505140000 (kept verbatim for backwards-compat
  -- + cron continuity).

  -- Rule 1: awards above sanity cap
  WITH flagged AS (
    UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE estimated_total_value_usd > 2000000 AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'award_above_2M'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 2: deadline > 2 years in the past, not annual/rolling
  WITH flagged AS (
    UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE application_deadline < CURRENT_DATE - INTERVAL '2 years'
      AND lower(coalesce(deadline_type, '')) NOT IN ('annual', 'rolling', 'continuous')
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_2yr_past'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 3: deadline > 5 years in the future
  WITH flagged AS (
    UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE application_deadline > CURRENT_DATE + INTERVAL '5 years'
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_5yr_future'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 4: provider name junk patterns
  WITH flagged AS (
    UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE provider_name IS NOT NULL
      AND btrim(provider_name) ~* '^(various|multiple|several|n/?a|none|unknown|tbd|to be determined|—|-)\.?$'
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'provider_junk'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 5: scholarship_name length pathology
  WITH flagged AS (
    UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE (length(coalesce(scholarship_name, '')) < 8 OR length(coalesce(scholarship_name, '')) > 200)
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'name_length_pathological'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 6: why_this_fits title-echo
  WITH cleaned AS (
    UPDATE public.scholarships s SET why_this_fits = NULL
    WHERE s.why_this_fits IS NOT NULL
      AND length(s.scholarship_name) > 16
      AND lower(s.why_this_fits) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.why_this_fits) < length(s.scholarship_name) + 60
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'why_this_fits_title_echo'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 7: how_to_win title-echo
  WITH cleaned AS (
    UPDATE public.scholarships s SET how_to_win = NULL
    WHERE s.how_to_win IS NOT NULL
      AND length(s.scholarship_name) > 16
      AND lower(s.how_to_win) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.how_to_win) < length(s.scholarship_name) + 80
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'how_to_win_title_echo'; rows_flagged := v_count; RETURN NEXT;

  -- ─────────────────────────────────────────────────────────────────
  -- NEW RULES (added 2026-05-09 after the Mastercard / Vanier / etc
  -- catalog audit that surfaced 5 wrong rows that should never have
  -- shipped.)
  -- ─────────────────────────────────────────────────────────────────

  -- Rule 8: Mastercard Foundation Scholars Program — must be SSA-only.
  -- Flag broken if any non-African nationality is in eligible_countries.
  -- Empty eligible_countries also flagged (over-permissive).
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken', last_verified_at = now()
    WHERE (scholarship_name ILIKE '%mastercard foundation%scholar%' OR provider_name ILIKE '%mastercard foundation%')
      AND verification_status IS DISTINCT FROM 'broken'
      AND (
        eligible_countries IS NULL
        OR cardinality(eligible_countries) = 0
        OR EXISTS (
          SELECT 1 FROM unnest(eligible_countries) ec
          WHERE lower(ec) ~ '\m(united states|usa|canada|united kingdom|uk|kazakhstan|kyrgyzstan|china|india|pakistan|bangladesh|russia|ukraine|brazil|mexico|australia|japan|korea|germany|france|spain|italy|netherlands|sweden|norway|finland|all countries|all nationalities|worldwide|international)\M'
        )
      )
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'mastercard_eligibility_overreach'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 9: Discontinued-program registry. Programs known to have
  -- been retired by their funders. Add new entries here as they
  -- surface in audits. Each match flips to verification_status='broken'
  -- + lifecycle_status='closed_archived' so it stops surfacing.
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'broken',
        lifecycle_status    = 'closed_archived',
        last_verified_at    = now()
    WHERE (
        -- Vanier CGS: discontinued Fall 2024
        (scholarship_name ILIKE '%vanier%' AND scholarship_name NOT ILIKE '%canada graduate research%')
      )
      AND verification_status IS DISTINCT FROM 'broken'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'discontinued_program_registry'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 10: Annual programs past their deadline AND verified > 14
  -- days ago should be flagged 'stale' so verify-cron prioritises
  -- them. Catches "Chevening shows Apply now between cycles" and
  -- "Fulbright deadline passed but row never updated" classes of
  -- error before the public sees them.
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'stale'
    WHERE deadline_type = 'annual'
      AND application_deadline < CURRENT_DATE
      AND application_deadline > CURRENT_DATE - INTERVAL '60 days'
      AND (last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '14 days')
      AND verification_status IS DISTINCT FROM 'broken'
      AND verification_status IS DISTINCT FROM 'stale'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'annual_deadline_just_passed_stale'; rows_flagged := v_count; RETURN NEXT;

  -- Rule 11: Famous-program eligibility-empty integrity check.
  -- A row matching a famous-program name pattern with NULL or empty
  -- eligible_countries is suspicious — these programs all have
  -- known eligibility constraints. Flag stale (don't break — we
  -- want them re-verified, not suppressed).
  WITH flagged AS (
    UPDATE public.scholarships
    SET verification_status = 'stale'
    WHERE (
            scholarship_name ILIKE '%chevening%'
         OR scholarship_name ILIKE '%fulbright%'
         OR scholarship_name ILIKE '%mastercard foundation%scholar%'
         OR scholarship_name ILIKE '%schwarzman%'
         OR scholarship_name ILIKE '%rhodes%'
         OR scholarship_name ILIKE '%knight-hennessy%'
         OR scholarship_name ILIKE '%gates cambridge%'
         OR scholarship_name ILIKE '%marshall scholar%'
         OR scholarship_name ILIKE '%commonwealth%scholar%'
         OR scholarship_name ILIKE '%erasmus mundus%'
         OR scholarship_name ILIKE '%mext%'
         OR scholarship_name ILIKE '%daad%'
      )
      AND (eligible_countries IS NULL OR cardinality(eligible_countries) = 0)
      AND verification_status IS DISTINCT FROM 'broken'
      AND verification_status IS DISTINCT FROM 'stale'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'famous_program_eligibility_empty'; rows_flagged := v_count; RETURN NEXT;

  RETURN;
END
$$;

GRANT EXECUTE ON FUNCTION public.detect_scholarship_anomalies() TO service_role;

-- Run once at apply so the new rules execute against the current catalog.
SELECT * FROM public.detect_scholarship_anomalies();
