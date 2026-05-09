-- =============================================================================
-- Heuristic backfill — eligible_countries + provider_name + host_country
-- =============================================================================
-- Audit (230000) revealed 3 fillable structural gaps:
--   * eligible_countries:  67/213 — extractable from citizenship text
--   * provider_name:      188/213 — derivable from scholarship_name + URL
--   * host_country:       179/213 — derivable from scholarship_name patterns
-- =============================================================================

-- ─── 1. eligible_countries from "international" / "all countries" ────
-- Programs that explicitly target international students get a wide
-- regional tag. Discover treats this as wildcard-friendly so the row
-- surfaces under any country filter.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET eligible_countries = ARRAY['International']
  WHERE (eligible_countries IS NULL OR cardinality(eligible_countries) = 0)
    AND (
      eligibility_requirements ~* '\m(international|all (countries|nations)|worldwide|global|any nationality|all eligible)\M'
      OR citizenship_requirements ~* '\m(international|all (countries|nations)|worldwide|global|any nationality)\M'
      OR scholarship_name ~* '\m(international|global)\M'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[backfill] eligible_countries=International (broad): % row(s)', v_count;
END $$;

-- ─── 2. eligible_countries from Commonwealth/developing/ASEAN markers ─
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET eligible_countries = CASE
    WHEN scholarship_name ~* '\m(commonwealth)\M' OR citizenship_requirements ~* '\m(commonwealth)\M'
      THEN ARRAY['Commonwealth']
    WHEN scholarship_name ~* '\m(asean|aseanj|southeast asia)\M' OR citizenship_requirements ~* '\m(asean|southeast asia)\M'
      THEN ARRAY['ASEAN']
    WHEN scholarship_name ~* '\m(african|sub-saharan|africa)\M' OR citizenship_requirements ~* '\m(african|sub-saharan|africa)\M'
      THEN ARRAY['Africa']
    WHEN scholarship_name ~* '\m(eu|european|europe)\M' OR citizenship_requirements ~* '\m(eu citizen|european)\M'
      THEN ARRAY['Europe']
    WHEN scholarship_name ~* '\m(developing countries|developing nations|low.income)\M'
      OR citizenship_requirements ~* '\m(developing countries|developing nations|low.income)\M'
      THEN ARRAY['Developing Countries']
    ELSE NULL
  END
  WHERE (eligible_countries IS NULL OR cardinality(eligible_countries) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[backfill] eligible_countries=region-tag: % row(s)', v_count;
END $$;

-- ─── 3. eligible_countries default — "International" for everything else ─
-- The fields filter behaviour is wildcard-friendly for "International",
-- so rows still NULL after region matching get the broad tag.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET eligible_countries = ARRAY['International']
  WHERE (eligible_countries IS NULL OR cardinality(eligible_countries) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[backfill] eligible_countries=International (fallback): % row(s)', v_count;
END $$;

-- ─── 4. provider_name from scholarship_name patterns ────────────────
-- Famous funder names embedded in the scholarship name. We've already
-- seeded the registry with these — this just makes provider_name match.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET provider_name = CASE
    WHEN scholarship_name ~* '\mdaad\M'                    THEN 'DAAD'
    WHEN scholarship_name ~* '\mcommonwealth\M'             THEN 'Commonwealth Scholarship Commission'
    WHEN scholarship_name ~* '\merasmus\M'                  THEN 'European Commission'
    WHEN scholarship_name ~* '\mchevening\M'                THEN 'UK Government FCDO'
    WHEN scholarship_name ~* '\mfulbright\M'                THEN 'U.S. Department of State'
    WHEN scholarship_name ~* '\mrhodes\M'                   THEN 'Rhodes Trust'
    WHEN scholarship_name ~* '\mknight[-\s]hennessy\M'      THEN 'Stanford University'
    WHEN scholarship_name ~* '\mgates cambridge\M'          THEN 'Gates Cambridge Trust'
    WHEN scholarship_name ~* '\mschwarzman\M'               THEN 'Schwarzman Scholars'
    WHEN scholarship_name ~* '\mmarshall\M'                 THEN 'Marshall Aid Commemoration Commission'
    WHEN scholarship_name ~* '\m(mext|japanese government)\M' THEN 'Japanese Government MEXT'
    WHEN scholarship_name ~* '\mmastercard foundation\M'    THEN 'Mastercard Foundation'
    WHEN scholarship_name ~* '\maga khan\M'                 THEN 'Aga Khan Foundation'
    WHEN scholarship_name ~* '\meiffel\M'                   THEN 'Campus France'
    WHEN scholarship_name ~* '\mmanaaki|new zealand\M'      THEN 'Government of New Zealand'
    WHEN scholarship_name ~* '\mswedish institute\M'        THEN 'Swedish Institute'
    WHEN scholarship_name ~* '\mhubert humphrey\M'          THEN 'U.S. Department of State'
    WHEN scholarship_name ~* '\madb\M'                      THEN 'Asian Development Bank'
    WHEN scholarship_name ~* '\mbritish council\M'          THEN 'British Council'
    WHEN scholarship_name ~* '\miccr\M'                     THEN 'Indian Council for Cultural Relations'
    ELSE NULL
  END
  WHERE provider_name IS NULL OR length(btrim(provider_name)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[backfill] provider_name from name regex: % row(s)', v_count;
END $$;

-- ─── 5. host_country from scholarship_name patterns ────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET host_country = CASE
    WHEN scholarship_name ~* '\m(study in canada|university of toronto|mcgill|ubc|british columbia|carleton|waterloo)\M' OR provider_name ~* '\mcanada\M' THEN 'Canada'
    WHEN scholarship_name ~* '\m(uk |united kingdom|british|cambridge|oxford|nottingham|sheffield|chevening|commonwealth|rhodes|gates cambridge|marshall|ucl)\M' THEN 'United Kingdom'
    WHEN scholarship_name ~* '\m(germany|german|daad|berlin|munich)\M' THEN 'Germany'
    WHEN scholarship_name ~* '\m(france|french|eiffel|paris)\M' THEN 'France'
    WHEN scholarship_name ~* '\m(australia|australian|sydney|melbourne)\M' THEN 'Australia'
    WHEN scholarship_name ~* '\m(new zealand|nz |manaaki)\M' THEN 'New Zealand'
    WHEN scholarship_name ~* '\m(usa|united states|fulbright|schwarzman|knight[-\s]hennessy|berea|brandeis|clark university)\M' THEN 'United States'
    WHEN scholarship_name ~* '\m(japan|mext|honjo|japanese)\M' THEN 'Japan'
    WHEN scholarship_name ~* '\m(china|chinese|tsinghua|peking)\M' THEN 'China'
    WHEN scholarship_name ~* '\m(singapore|nus|ntu|a\*star)\M' THEN 'Singapore'
    WHEN scholarship_name ~* '\m(hong kong|hku|cuhk)\M' THEN 'Hong Kong'
    WHEN scholarship_name ~* '\m(sweden|swedish|stockholm)\M' THEN 'Sweden'
    WHEN scholarship_name ~* '\m(netherlands|dutch|holland)\M' THEN 'Netherlands'
    WHEN scholarship_name ~* '\m(denmark|danish|aarhus|copenhagen)\M' THEN 'Denmark'
    WHEN scholarship_name ~* '\m(finland|finnish|helsinki)\M' THEN 'Finland'
    WHEN scholarship_name ~* '\m(belgium|vlir)\M' THEN 'Belgium'
    WHEN scholarship_name ~* '\m(india|indian|iit|iim|iccr)\M' THEN 'India'
    WHEN scholarship_name ~* '\m(saudi|kaust|king abdullah)\M' THEN 'Saudi Arabia'
    WHEN scholarship_name ~* '\m(uae|emirates|khalifa)\M' THEN 'United Arab Emirates'
    WHEN scholarship_name ~* '\m(turkey|turk[ıi]ye)\M' THEN 'Turkey'
    WHEN scholarship_name ~* '\m(estonia|estonian)\M' THEN 'Estonia'
    WHEN scholarship_name ~* '\m(czech|charles university)\M' THEN 'Czech Republic'
    ELSE NULL
  END
  WHERE host_country IS NULL OR length(btrim(host_country)) = 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[backfill] host_country from name regex: % row(s)', v_count;
END $$;

-- ─── Audit ──────────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[bf_after] eligible_countries:    % / %', (SELECT count(*) FROM public.scholarships WHERE eligible_countries IS NOT NULL AND cardinality(eligible_countries) > 0), v_total;
  RAISE NOTICE '[bf_after] provider_name:         % / %', (SELECT count(*) FROM public.scholarships WHERE provider_name IS NOT NULL AND length(btrim(provider_name)) > 0), v_total;
  RAISE NOTICE '[bf_after] host_country:          % / %', (SELECT count(*) FROM public.scholarships WHERE host_country IS NOT NULL AND length(btrim(host_country)) > 0), v_total;
  RAISE NOTICE '[bf_after] avg data_completeness: %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
