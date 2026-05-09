-- =============================================================================
-- Consolidate near-duplicate scholarship variants under one canonical row
-- =============================================================================

-- ─── Preserve 'superseded' across the daily lifecycle refresh ─────
-- Without this, the 03:00 UTC refresh-lifecycle-status cron computes
-- a fresh value from application_deadline+deadline_type and overwrites
-- our 'superseded' marker back to 'active', un-hiding the duplicates.
CREATE OR REPLACE FUNCTION public.refresh_lifecycle_status()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.scholarships
  SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type),
      next_open_at = public.scholarship_next_open(application_deadline, deadline_type)
  WHERE
    lifecycle_status IS DISTINCT FROM 'superseded'
    AND (
      lifecycle_status IS DISTINCT FROM public.scholarship_lifecycle(application_deadline, deadline_type)
      OR next_open_at IS DISTINCT FROM public.scholarship_next_open(application_deadline, deadline_type)
    );
$$;

-- User reported the catalog has three Commonwealth listings that are
-- effectively variants of the same program (Commonwealth Master's,
-- Commonwealth Shared, Commonwealth Distance Learning Master's). Same
-- funder, same eligibility, same canonical URL — different track names.
-- Three rows clog Discover; should be ONE listing with the variants
-- mentioned in the description.
--
-- Approach: pick the highest-completeness row as canonical; mark the
-- rest as lifecycle_status='superseded' so they exit Discover. Add a
-- short note to the canonical's description listing the consolidated
-- track names. Idempotent — safe to re-run.
--
-- Discover read filter is `lifecycle_status IN (active, reopens_annually)
-- OR IS NULL` so 'superseded' rows are auto-hidden without dropping the
-- data (direct /scholarships/:id links still work).
-- =============================================================================

-- ─── Helper: append a "Variants:" note to the canonical row's
--     overview text. Idempotent — won't duplicate if already present.
CREATE OR REPLACE FUNCTION public._append_variants_note(
  p_scholarship_id uuid,
  p_variants text[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing text;
  v_note text;
BEGIN
  v_note := 'Variants under the same program: ' || array_to_string(p_variants, ', ') || '.';

  SELECT why_this_fits INTO v_existing
  FROM public.scholarships WHERE scholarship_id = p_scholarship_id;

  IF v_existing IS NULL OR position(v_note IN v_existing) = 0 THEN
    UPDATE public.scholarships
    SET why_this_fits = COALESCE(v_existing || E'\n\n' || v_note, v_note)
    WHERE scholarship_id = p_scholarship_id;
  END IF;
END
$$;

-- ─── Commonwealth family ──────────────────────────────────────────
-- Merge Commonwealth Master's + Shared + Distance Learning Master's
-- into the highest-completeness Commonwealth row. PhD scholarships
-- stay separate (different audience).
DO $$
DECLARE
  v_canonical_id uuid;
  v_supersede_count int;
  v_variant_names text[];
BEGIN
  -- Pick canonical: highest data_completeness_score among Commonwealth
  -- master's-track rows. ORDER BY also breaks ties by deadline (closer
  -- = canonical) and by created_at (older = canonical).
  SELECT scholarship_id INTO v_canonical_id
  FROM public.scholarships
  WHERE scholarship_name ~* '^commonwealth\s+'
    AND scholarship_name ~* '\m(master|shared|distance|scholarship|scholarships)\M'
    AND scholarship_name !~* '\m(phd|doctoral|professional fellow)\M'
    AND verification_status <> 'broken'
  ORDER BY data_completeness_score DESC NULLS LAST,
           application_deadline ASC NULLS LAST,
           created_at ASC NULLS LAST
  LIMIT 1;

  IF v_canonical_id IS NULL THEN
    RAISE NOTICE '[consolidate] no Commonwealth master''s candidate — skipping';
    RETURN;
  END IF;

  -- Collect the names of the variants we're folding in.
  SELECT array_agg(scholarship_name) INTO v_variant_names
  FROM public.scholarships
  WHERE scholarship_name ~* '^commonwealth\s+'
    AND scholarship_name ~* '\m(master|shared|distance)\M'
    AND scholarship_name !~* '\m(phd|doctoral|professional fellow)\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;

  -- Mark non-canonical Commonwealth variants as superseded
  UPDATE public.scholarships
  SET lifecycle_status = 'superseded'
  WHERE scholarship_name ~* '^commonwealth\s+'
    AND scholarship_name ~* '\m(master|shared|distance)\M'
    AND scholarship_name !~* '\m(phd|doctoral|professional fellow)\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;
  GET DIAGNOSTICS v_supersede_count = ROW_COUNT;

  -- Update the canonical row's name to the umbrella term + add variants note
  UPDATE public.scholarships
  SET scholarship_name = 'Commonwealth Master''s Scholarships'
  WHERE scholarship_id = v_canonical_id
    AND scholarship_name <> 'Commonwealth Master''s Scholarships';

  IF v_variant_names IS NOT NULL AND cardinality(v_variant_names) > 0 THEN
    PERFORM public._append_variants_note(v_canonical_id, v_variant_names);
  END IF;

  RAISE NOTICE '[consolidate] Commonwealth — canonical=%, superseded=%, variants=%',
    v_canonical_id, v_supersede_count,
    COALESCE(array_to_string(v_variant_names, ' / '), '∅');
END $$;

-- ─── DAAD master's family (smaller cluster) ──────────────────────
DO $$
DECLARE
  v_canonical_id uuid;
  v_supersede_count int;
  v_variant_names text[];
BEGIN
  SELECT scholarship_id INTO v_canonical_id
  FROM public.scholarships
  WHERE scholarship_name ~* '^daad\b'
    AND scholarship_name !~* '\m(phd|doctoral|research grant)\M'
    AND verification_status <> 'broken'
  ORDER BY data_completeness_score DESC NULLS LAST,
           application_deadline ASC NULLS LAST,
           created_at ASC NULLS LAST
  LIMIT 1;

  IF v_canonical_id IS NULL THEN
    RAISE NOTICE '[consolidate] no DAAD master''s candidate — skipping';
    RETURN;
  END IF;

  SELECT array_agg(scholarship_name) INTO v_variant_names
  FROM public.scholarships
  WHERE scholarship_name ~* '^daad\b'
    AND scholarship_name !~* '\m(phd|doctoral|research grant)\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;

  UPDATE public.scholarships
  SET lifecycle_status = 'superseded'
  WHERE scholarship_name ~* '^daad\b'
    AND scholarship_name !~* '\m(phd|doctoral|research grant)\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;
  GET DIAGNOSTICS v_supersede_count = ROW_COUNT;

  IF v_variant_names IS NOT NULL AND cardinality(v_variant_names) > 0 THEN
    PERFORM public._append_variants_note(v_canonical_id, v_variant_names);
  END IF;

  RAISE NOTICE '[consolidate] DAAD master''s — canonical=%, superseded=%',
    v_canonical_id, v_supersede_count;
END $$;

-- ─── Aga Khan family ─────────────────────────────────────────────
DO $$
DECLARE
  v_canonical_id uuid;
  v_supersede_count int;
  v_variant_names text[];
BEGIN
  SELECT scholarship_id INTO v_canonical_id
  FROM public.scholarships
  WHERE scholarship_name ~* '\maga\s+khan\M'
    AND verification_status <> 'broken'
  ORDER BY data_completeness_score DESC NULLS LAST,
           application_deadline ASC NULLS LAST,
           created_at ASC NULLS LAST
  LIMIT 1;

  IF v_canonical_id IS NULL THEN
    RAISE NOTICE '[consolidate] no Aga Khan candidate — skipping';
    RETURN;
  END IF;

  SELECT array_agg(scholarship_name) INTO v_variant_names
  FROM public.scholarships
  WHERE scholarship_name ~* '\maga\s+khan\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;

  UPDATE public.scholarships
  SET lifecycle_status = 'superseded'
  WHERE scholarship_name ~* '\maga\s+khan\M'
    AND verification_status <> 'broken'
    AND scholarship_id <> v_canonical_id;
  GET DIAGNOSTICS v_supersede_count = ROW_COUNT;

  IF v_variant_names IS NOT NULL AND cardinality(v_variant_names) > 0 THEN
    PERFORM public._append_variants_note(v_canonical_id, v_variant_names);
  END IF;

  RAISE NOTICE '[consolidate] Aga Khan — canonical=%, superseded=%',
    v_canonical_id, v_supersede_count;
END $$;

-- ─── Final audit ───────────────────────────────────────────────────
DO $$
DECLARE v_total int; v_active int; v_superseded int;
BEGIN
  SELECT count(*) INTO v_total       FROM public.scholarships;
  SELECT count(*) INTO v_active      FROM public.scholarships WHERE lifecycle_status IN ('active', 'reopens_annually') OR lifecycle_status IS NULL;
  SELECT count(*) INTO v_superseded  FROM public.scholarships WHERE lifecycle_status = 'superseded';
  RAISE NOTICE '[consolidate_after] total=%, discover-eligible=%, superseded=%',
    v_total, v_active, v_superseded;
END $$;
