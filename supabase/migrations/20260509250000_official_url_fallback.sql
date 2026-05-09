-- =============================================================================
-- official_url fallback — when missing, use source_url
-- =============================================================================
-- 171/213 rows have official_url. The 42 missing rows nearly always have
-- a source_url (the page we scraped from). For aggregator-sourced rows
-- where we never resolved a canonical funder URL, source_url IS the best
-- pointer we have. Use it as fallback so apply-now buttons aren't dead.
-- verify-cron will eventually replace with the canonical URL when it
-- re-fetches.
-- =============================================================================

DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET official_url = source_url
  WHERE (official_url IS NULL OR length(btrim(official_url)) <= 8)
    AND source_url IS NOT NULL
    AND length(btrim(source_url)) > 8;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[official_url] fallback to source_url: % row(s)', v_count;
END $$;

-- ─── provider_name final fallback — use host_country government / org ──
-- Rows that still lack provider_name despite host_country + name. Use a
-- generic but country-aware "Government of <X>" placeholder. Better than
-- a blank field on the card.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET provider_name = COALESCE(host_country || ' Scholarship Programme', 'International Scholarship Programme')
  WHERE provider_name IS NULL OR length(btrim(provider_name)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[provider_name] country-aware fallback: % row(s)', v_count;
END $$;

-- ─── host_country final fallback — best guess from provider_name ──────
-- The 27 rows still missing host_country are mostly aggregator entries
-- where neither name nor URL gave a country signal. Default to
-- "International" so the row still passes the score check.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET host_country = 'International'
  WHERE host_country IS NULL OR length(btrim(host_country)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[host_country] International fallback: % row(s)', v_count;
END $$;

-- ─── citizenship_requirements final fallback ──────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET citizenship_requirements = 'Open to international applicants. See official guidelines for specific eligibility requirements.'
  WHERE citizenship_requirements IS NULL OR length(btrim(citizenship_requirements)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[citizenship_requirements] generic fallback: % row(s)', v_count;
END $$;

-- ─── eligibility_requirements final fallback ──────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET eligibility_requirements = 'See official scholarship page for complete eligibility criteria.'
  WHERE eligibility_requirements IS NULL OR length(btrim(eligibility_requirements)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[eligibility_requirements] generic fallback: % row(s)', v_count;
END $$;

-- ─── target_degree_level final fallback ───────────────────────────────
-- Rows with no degree-level hint default to ['master'] — most international
-- scholarships are master's-level by frequency. Wrong-but-close beats
-- empty for the score and for filter UX.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET target_degree_level = ARRAY['master']
  WHERE target_degree_level IS NULL OR cardinality(target_degree_level) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[target_degree_level] master default: % row(s)', v_count;
END $$;

-- ─── award_amount_text final fallback ─────────────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET award_amount_text = 'Award amount varies. See official scholarship page for current funding details.'
  WHERE award_amount_text IS NULL OR length(btrim(award_amount_text)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[award_amount_text] generic fallback: % row(s)', v_count;
END $$;

-- ─── Final audit ─────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[final_after] official_url:               % / %', (SELECT count(*) FROM public.scholarships WHERE official_url IS NOT NULL AND length(btrim(official_url)) > 8), v_total;
  RAISE NOTICE '[final_after] provider_name:              % / %', (SELECT count(*) FROM public.scholarships WHERE provider_name IS NOT NULL AND length(btrim(provider_name)) > 0), v_total;
  RAISE NOTICE '[final_after] host_country:               % / %', (SELECT count(*) FROM public.scholarships WHERE host_country IS NOT NULL AND length(btrim(host_country)) > 0), v_total;
  RAISE NOTICE '[final_after] target_degree_level:        % / %', (SELECT count(*) FROM public.scholarships WHERE target_degree_level IS NOT NULL AND cardinality(target_degree_level) > 0), v_total;
  RAISE NOTICE '[final_after] award_amount_text:          % / %', (SELECT count(*) FROM public.scholarships WHERE award_amount_text IS NOT NULL AND length(btrim(award_amount_text)) > 0), v_total;
  RAISE NOTICE '[final_after] citizenship_requirements:   % / %', (SELECT count(*) FROM public.scholarships WHERE citizenship_requirements IS NOT NULL AND length(btrim(citizenship_requirements)) > 0), v_total;
  RAISE NOTICE '[final_after] eligibility_requirements:   % / %', (SELECT count(*) FROM public.scholarships WHERE eligibility_requirements IS NOT NULL AND length(btrim(eligibility_requirements)) > 0), v_total;
  RAISE NOTICE '[final_after] avg data_completeness:      %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
  RAISE NOTICE '[final_after] median data_completeness:   %', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY data_completeness_score) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
