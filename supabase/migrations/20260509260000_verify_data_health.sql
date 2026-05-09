-- =============================================================================
-- Sanity check — verify catalog state + flag obvious data quality issues
-- =============================================================================

-- ─── 1. confidence column health ─────────────────────────────────────
DO $$
DECLARE v_total int; v_with_conf int; v_avg numeric;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  SELECT count(*) INTO v_with_conf FROM public.scholarships WHERE confidence IS NOT NULL;
  SELECT round(avg(confidence)::numeric, 3) INTO v_avg FROM public.scholarships WHERE confidence IS NOT NULL;
  RAISE NOTICE '[health] confidence populated: % / % | avg = %', v_with_conf, v_total, v_avg;
END $$;

-- ─── 2. Rows that are dead (no URL anywhere) ─────────────────────────
-- These should be marked broken so they exit Discover. Currently
-- official_url IS NULL AND source_url IS NULL means we can't even
-- verify them — verify-cron skips them silently.
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.scholarships
  WHERE (official_url IS NULL OR length(btrim(official_url)) <= 8)
    AND (source_url IS NULL OR length(btrim(source_url)) <= 8)
    AND verification_status <> 'broken';
  RAISE NOTICE '[health] rows with NO URL but not broken: %', v_count;

  -- Mark them broken so they exit Discover
  UPDATE public.scholarships
  SET verification_status = 'broken'
  WHERE (official_url IS NULL OR length(btrim(official_url)) <= 8)
    AND (source_url IS NULL OR length(btrim(source_url)) <= 8)
    AND verification_status <> 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[health] urlless rows marked broken: %', v_count;
END $$;

-- ─── confidence default — bootstrap trust calibration ────────────────
-- Until verify-cron drains and writes fresh confidence values, every
-- row is NULL and trust calibration is a no-op. Set a baseline 0.80
-- (slightly below auto-publish threshold) for currently-verified rows
-- so the trust signal isn't entirely dead.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET confidence = 0.80
  WHERE confidence IS NULL
    AND verification_status = 'verified';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[health] confidence=0.80 bootstrap for verified rows: %', v_count;

  UPDATE public.scholarships
  SET confidence = 0.65
  WHERE confidence IS NULL
    AND verification_status IN ('stale', 'pending');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[health] confidence=0.65 bootstrap for stale/pending: %', v_count;
END $$;

-- ─── 3. Rows where heuristic defaults LOOK suspicious ─────────────────
-- target_fields=['All Fields'] but scholarship_name has a clear field
-- cue we didn't catch in pass 1 or 2.
DO $$
DECLARE r record; v_i int := 0;
BEGIN
  RAISE NOTICE '─── target_fields=[All Fields] sanity check (sample 10) ───';
  FOR r IN
    SELECT scholarship_name
    FROM public.scholarships
    WHERE 'All Fields' = ANY(target_fields)
      AND cardinality(target_fields) = 1
    ORDER BY random()
    LIMIT 10
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[allfields %] %', v_i, r.scholarship_name;
  END LOOP;
END $$;

-- ─── 4. Final post-everything audit ──────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '─── Final state ───';
  RAISE NOTICE 'total: %', v_total;
  RAISE NOTICE 'verified: %    stale: %    broken: %    pending: %',
    (SELECT count(*) FROM public.scholarships WHERE verification_status = 'verified'),
    (SELECT count(*) FROM public.scholarships WHERE verification_status = 'stale'),
    (SELECT count(*) FROM public.scholarships WHERE verification_status = 'broken'),
    (SELECT count(*) FROM public.scholarships WHERE verification_status = 'pending');
  RAISE NOTICE 'Discover-eligible (not broken): % rows',
    (SELECT count(*) FROM public.scholarships WHERE verification_status <> 'broken');
  RAISE NOTICE 'avg data_completeness_score: %',
    (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE verification_status <> 'broken');
END $$;
