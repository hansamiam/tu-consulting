-- =============================================================================
-- Heuristic backfill pass 2 — close the gaps the first pass left open
-- =============================================================================
-- After 180000:
--   * target_fields:    66/213 — name regex catches discipline-specific
--                       programs but misses "open to all" programs
--                       (DAAD, Commonwealth, Erasmus, Aga Khan, Eiffel...)
--   * selectivity:      99/213 — value-based heuristic skips rows where
--                       estimated_total_value_usd is NULL even though
--                       award text says "full tuition" / "fully funded"
--
-- This pass reads award_amount_text and broader name patterns to fill the
-- residual gaps. Same IS NULL guards — never overwrites data.
-- =============================================================================

-- ─── 1. selectivity_level from award_amount_text "fully funded" cues ─
-- A program advertising "full tuition" or "fully funded" is competitive
-- by definition (the funder is committing significant value), so we can
-- safely call those rows 'high' selectivity even without an exact dollar.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET selectivity_level = CASE
    WHEN award_amount_text ~* '\m(fully[\s-]funded|full[\s-]ride|full tuition|covers tuition|full scholarship|all expenses|complete funding|approved airfare)\M' THEN 'high'
    WHEN award_amount_text ~* '\m(monthly stipend|monthly allowance|living allowance|monthly grant|stipend of|allowance of)\M' THEN 'medium'
    WHEN award_amount_text ~* '\m(partial|tuition waiver|fee waiver|reduction)\M' THEN 'medium'
    ELSE selectivity_level
  END
  WHERE selectivity_level IS NULL
    AND award_amount_text IS NOT NULL
    AND length(btrim(award_amount_text)) > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] selectivity from award text: % row(s)', v_count;
END $$;

-- ─── 2. selectivity_level final fallback = 'medium' ─────────────────
-- Anything still NULL gets 'medium' as the most defensible neutral
-- default. Rows that are actually high/low will get re-classified by
-- enrich-cron when narrative content is generated.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET selectivity_level = 'medium'
  WHERE selectivity_level IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] selectivity default=medium: % row(s)', v_count;
END $$;

-- ─── 3. target_fields — scoped catch for known multi-discipline programs ─
-- Famous "open to all eligible fields" programs. Tagging them with a
-- broad multi-discipline marker so they appear under any field filter
-- in Discover (the matching engine treats this as wildcard-friendly).
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET target_fields = ARRAY['All Fields']
  WHERE (target_fields IS NULL OR cardinality(target_fields) = 0)
    AND (
      scholarship_name ~* '\m(daad|commonwealth|erasmus|chevening|fulbright|rhodes|knight[- ]hennessy|gates cambridge|schwarzman|marshall|mext|aga khan|eiffel|cambridge trust|manaaki|new zealand scholarship|mastercard foundation|swedish institute|nottingham developing|nottingham university|si scholarship|hubert humphrey|adb[- ]japan|aga khan|hong kong phd|inlaks|inspire|ucl global|charles university|estonian government|nutanix|idrc|insead|bcdi|adb|wehrung|british council|quad stem|study in canada|research grants in germany|france excellence|vlir|ampère|ampere|kaust|king abdullah)\M'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] target_fields=All Fields for famous programs: % row(s)', v_count;
END $$;

-- ─── 4. target_fields — additional name-regex catches missed in pass 1 ─
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET target_fields = CASE
    WHEN scholarship_name ~* '\m(women in stem|women in tech|women in science)\M' THEN ARRAY['STEM', 'Women in STEM']
    WHEN scholarship_name ~* '\m(development|developing solutions|global)\M' THEN ARRAY['Development Studies', 'Public Policy']
    WHEN scholarship_name ~* '\m(research)\M' THEN ARRAY['Research']
    WHEN scholarship_name ~* '\m(leadership|leaders?)\M' THEN ARRAY['Leadership']
    WHEN scholarship_name ~* '\m(culture|cultural)\M' THEN ARRAY['Cultural Studies']
    WHEN scholarship_name ~* '\m(graduate|postgraduate|master\b|phd|doctoral)\M' THEN ARRAY['All Fields']
    ELSE NULL
  END
  WHERE (target_fields IS NULL OR cardinality(target_fields) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] target_fields from broader name regex: % row(s)', v_count;
END $$;

-- ─── 5. target_fields final fallback — "All Fields" for everything else ─
-- If none of the above caught it, the program is most likely
-- discipline-agnostic (or the name is too generic to tell). Tagging
-- "All Fields" lets the row surface in Discover; verify-cron will
-- refine when it touches the row.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET target_fields = ARRAY['All Fields']
  WHERE (target_fields IS NULL OR cardinality(target_fields) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] target_fields=All Fields fallback: % row(s)', v_count;
END $$;

-- ─── 6. effort_level default by selectivity (cascade) ────────────────
-- Selectivity correlates with effort. High selectivity → high effort
-- (essay, multiple recs, interview, longer process).
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET effort_level = CASE
    WHEN selectivity_level IN ('very_high', 'high') THEN 'high'
    WHEN selectivity_level = 'medium' THEN 'medium'
    ELSE 'low'
  END
  WHERE effort_level IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] effort_level from selectivity: % row(s)', v_count;
END $$;

-- ─── 7. essay_required default for high/very_high selectivity ────────
-- Competitive scholarships almost universally require an essay. Set
-- true wherever flag is null and selectivity says competitive.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET essay_required = true
  WHERE essay_required IS NULL
    AND selectivity_level IN ('very_high', 'high');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] essay_required=true for selective: % row(s)', v_count;
END $$;

-- ─── 8. recommendation_letters_required default for very high ────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET recommendation_letters_required = 2
  WHERE recommendation_letters_required IS NULL
    AND selectivity_level = 'very_high';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic2] recommendation_letters_required=2 for very_high: % row(s)', v_count;
END $$;

-- ─── Final audit ────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[h2_after] target_fields:        % / %', (SELECT count(*) FROM public.scholarships WHERE target_fields IS NOT NULL AND cardinality(target_fields) > 0), v_total;
  RAISE NOTICE '[h2_after] selectivity_level:    % / %', (SELECT count(*) FROM public.scholarships WHERE selectivity_level IS NOT NULL), v_total;
  RAISE NOTICE '[h2_after] effort_level:         % / %', (SELECT count(*) FROM public.scholarships WHERE effort_level IS NOT NULL), v_total;
  RAISE NOTICE '[h2_after] essay_required:       % / %', (SELECT count(*) FROM public.scholarships WHERE essay_required IS NOT NULL), v_total;
  RAISE NOTICE '[h2_after] duration_text:        % / %', (SELECT count(*) FROM public.scholarships WHERE duration_text IS NOT NULL AND length(btrim(duration_text)) > 0), v_total;
  RAISE NOTICE '[h2_after] deadline_type:        % / %', (SELECT count(*) FROM public.scholarships WHERE deadline_type IS NOT NULL), v_total;
  RAISE NOTICE '[h2_after] avg data_completeness_score: %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
