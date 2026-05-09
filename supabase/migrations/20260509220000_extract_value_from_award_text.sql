-- =============================================================================
-- Heuristic value extraction — pull estimated_total_value_usd from award text
-- =============================================================================
-- Scoring trigger gives 1 point for estimated_total_value_usd being populated
-- and another for the funding signal feeding selectivity. Many rows have rich
-- award_amount_text strings ("$10,200 for 4 months", "£15,000", "€1,200/month")
-- but no extracted USD number. Heuristic regex fills the obvious cases.
--
-- Approach: PER ORDER OF CONFIDENCE
--   1. Match "$X,XXX" or "$X" patterns directly  (USD)
--   2. Match "£X,XXX" → multiply by 1.27          (GBP→USD)
--   3. Match "€X,XXX" → multiply by 1.07          (EUR→USD)
--   4. "Full tuition" / "fully funded" → 50000   (median tuition+living)
--   5. "Partial" / "tuition waiver" → 15000      (typical partial)
-- Conservative: only fires when estimated_total_value_usd IS NULL, never
-- overwrites. Result is rough but materially better than NULL.
-- =============================================================================

DO $$
DECLARE
  r record;
  v_match text;
  v_usd_value numeric;
  v_count_extracted int := 0;
  v_count_default int := 0;
BEGIN
  FOR r IN
    SELECT scholarship_id, award_amount_text
    FROM public.scholarships
    WHERE estimated_total_value_usd IS NULL
      AND award_amount_text IS NOT NULL
      AND length(btrim(award_amount_text)) > 0
  LOOP
    v_usd_value := NULL;

    -- USD: $X,XXX or $XXXX or $X.X
    v_match := substring(r.award_amount_text from '\$\s*([0-9][0-9,]*)');
    IF v_match IS NOT NULL THEN
      v_usd_value := replace(v_match, ',', '')::numeric;
      -- Heuristic: if matched is per-month (contains "/month" or "monthly"
      -- nearby), multiply by 12. If matched is annual or a one-time amount,
      -- leave as-is. We can't be perfect — we lean toward floor estimates.
      IF r.award_amount_text ~* '\m(per month|monthly|/month)\M' THEN
        v_usd_value := v_usd_value * 12;
      END IF;
    END IF;

    -- GBP if no USD found: £X,XXX
    IF v_usd_value IS NULL THEN
      v_match := substring(r.award_amount_text from '£\s*([0-9][0-9,]*)');
      IF v_match IS NOT NULL THEN
        v_usd_value := replace(v_match, ',', '')::numeric * 1.27;
        IF r.award_amount_text ~* '\m(per month|monthly|/month)\M' THEN
          v_usd_value := v_usd_value * 12;
        END IF;
      END IF;
    END IF;

    -- EUR if no USD/GBP: €X,XXX
    IF v_usd_value IS NULL THEN
      v_match := substring(r.award_amount_text from '€\s*([0-9][0-9,]*)');
      IF v_match IS NOT NULL THEN
        v_usd_value := replace(v_match, ',', '')::numeric * 1.07;
        IF r.award_amount_text ~* '\m(per month|monthly|/month)\M' THEN
          v_usd_value := v_usd_value * 12;
        END IF;
      END IF;
    END IF;

    -- If we extracted a number, write it (capped at 200k as sanity check
    -- against parsing accidents like "$10,000,000")
    IF v_usd_value IS NOT NULL AND v_usd_value BETWEEN 500 AND 200000 THEN
      UPDATE public.scholarships
      SET estimated_total_value_usd = round(v_usd_value)::int
      WHERE scholarship_id = r.scholarship_id
        AND estimated_total_value_usd IS NULL;
      v_count_extracted := v_count_extracted + 1;
      CONTINUE;
    END IF;

    -- Fallback: keyword-based defaults
    IF r.award_amount_text ~* '\m(fully[\s-]funded|full[\s-]ride|full tuition|covers tuition|all expenses|complete funding|approved airfare)\M' THEN
      UPDATE public.scholarships
      SET estimated_total_value_usd = 50000
      WHERE scholarship_id = r.scholarship_id AND estimated_total_value_usd IS NULL;
      v_count_default := v_count_default + 1;
    ELSIF r.award_amount_text ~* '\m(partial|tuition waiver|fee waiver|reduction|50%)\M' THEN
      UPDATE public.scholarships
      SET estimated_total_value_usd = 15000
      WHERE scholarship_id = r.scholarship_id AND estimated_total_value_usd IS NULL;
      v_count_default := v_count_default + 1;
    ELSIF r.award_amount_text ~* '\m(stipend|monthly allowance|living allowance|monthly grant)\M' THEN
      UPDATE public.scholarships
      SET estimated_total_value_usd = 25000
      WHERE scholarship_id = r.scholarship_id AND estimated_total_value_usd IS NULL;
      v_count_default := v_count_default + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '[extract_value] regex-extracted: %, keyword-defaulted: %',
    v_count_extracted, v_count_default;
END $$;

-- ─── Re-derive selectivity for rows that just got a value ──────────────
-- Now that more rows have estimated_total_value_usd, recompute selectivity
-- ONLY where it's still 'medium' default — don't downgrade things already
-- promoted to high/very_high.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET selectivity_level = CASE
    WHEN estimated_total_value_usd >= 100000 THEN 'very_high'
    WHEN estimated_total_value_usd >= 50000  THEN 'high'
    WHEN estimated_total_value_usd >= 15000  THEN 'medium'
    ELSE 'low'
  END
  WHERE selectivity_level = 'medium'
    AND estimated_total_value_usd IS NOT NULL
    AND estimated_total_value_usd > 0
    AND (estimated_total_value_usd >= 50000 OR estimated_total_value_usd < 15000);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[extract_value] selectivity refined from new values: % row(s)', v_count;
END $$;

-- ─── Audit ──────────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[extract_after] estimated_total_value_usd: % / %',
    (SELECT count(*) FROM public.scholarships WHERE estimated_total_value_usd IS NOT NULL AND estimated_total_value_usd > 0), v_total;
  RAISE NOTICE '[extract_after] avg data_completeness_score: %',
    (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
