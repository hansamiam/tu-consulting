-- Discover v1 — Phase A, source policy v1, Pass 1
-- Executes the high-confidence cuts per docs/source_audit_2026-05-22.md §1.1 + §1.2.
--
-- Scope of this migration:
--   A) Deactivate 17 non-whitelist aggregator entries (T3 hard-cap)
--   B) Reclassify the 4 whitelisted aggregators with source_tier = 'aggregator_discovery_only'
--   C) Tag 28 demographic-narrow foundations as demographic_tagged so personalization
--      can route them to matching profiles instead of polluting the global feed
--
-- NOT in this migration (waiting for user green-light):
--   - Pass 2 university cuts (173 → ~25), which is brand-curation territory
--   - Government / NGO deactivations (deferred to post-launch row-level gate analysis)
--
-- Reversibility: every row keeps a deactivation_reason + deactivated_at +
-- deactivation_policy_version. Reactivation = single UPDATE setting is_active=true.

-- ─────────────────────────────────────────────────────────────────────
-- A) T3 whitelist confirmation — these 4 are kept, classified explicitly
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.scholarship_sources
SET source_tier = 'aggregator_discovery_only',
    is_active = true,
    updated_at = now()
WHERE url IN (
  'https://opportunitiesforyouth.org/category/scholarships/',
  'https://opportunitiesforyouth.org/category/fellowship/',
  'https://opportunitiestracker.ug/category/scholarships/',
  'https://opportunitiestracker.ug/category/fellowships/'
);

-- ─────────────────────────────────────────────────────────────────────
-- B) T3 non-whitelist kills (17 entries)
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.scholarship_sources
SET is_active = false,
    deactivation_reason = 'pass1_non_whitelist_aggregator',
    deactivated_at = now(),
    deactivation_policy_version = 'v1-2026-05-22',
    updated_at = now()
WHERE category = 'aggregator'
  AND url NOT IN (
    'https://opportunitiesforyouth.org/category/scholarships/',
    'https://opportunitiesforyouth.org/category/fellowship/',
    'https://opportunitiestracker.ug/category/scholarships/',
    'https://opportunitiestracker.ug/category/fellowships/'
  )
  AND is_active = true;

-- ─────────────────────────────────────────────────────────────────────
-- C) Demographic-narrow foundation demotion (28 entries)
-- These stay is_active=true but get a demographic tag in parser_hint so the
-- personalization engine and admin UI know to route them to matching profiles
-- only. Future migration may add a structured `demographic_tag` column; for
-- now we prepend a machine-readable tag to parser_hint.
-- ─────────────────────────────────────────────────────────────────────

-- Helper: append "[demographic_tagged: <reason>] " to the front of parser_hint
-- (idempotent — won't double-tag if re-run).
UPDATE public.scholarship_sources
SET parser_hint = '[demographic_tagged: ' || _demographic || '] ' ||
                  COALESCE(parser_hint, ''),
    updated_at = now()
FROM (
  VALUES
    ('https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/american/', 'us_women_only'),
    ('https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/', 'women_only'),
    ('https://www.abbvie.com/our-company/community/abbvie-foundation/abbvie-scholarship.html', 'us_chronic_conditions'),
    ('https://research.adobe.com/scholarship/', 'women_stem'),
    ('https://www.africanleadershipacademy.org/admissions/scholarships/', 'pan_african_secondary'),
    ('https://awism.org/scholarships', 'african_women_stem'),
    ('https://www.ahead.org/professional-resources/financial-aid', 'us_disability'),
    ('https://www.aigcs.org/scholarships-fellowships/', 'native_american'),
    ('https://www.womentechmakers.com/scholars', 'women_computing'),
    ('https://asianpacificfund.org/what-we-do/scholarships-internships/', 'asian_american_us'),
    ('https://www.atlassian.com/company/careers/students/diversity-scholarship', 'underrep_tech'),
    ('https://www.aboutamazon.com/news/community/aws-aiml-scholarship-program', 'underrep_aiml'),
    ('https://beineckescholarship.org/', 'us_humanities_phd'),
    ('https://cobellscholar.org/', 'native_american'),
    ('https://dredf.org/', 'us_disability'),
    ('https://www.glaad.org/grants', 'us_lgbtq'),
    ('https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-india', 'india_women_cs'),
    ('https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-asia-pacific', 'apac_women_cs'),
    ('https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-emea', 'emea_women_cs'),
    ('https://www.lime-connect.com/programs/page/google-lime-scholarship-program-for-students-with-disabilities', 'disability_stem_na'),
    ('https://anitab.org/scholarships/', 'women_computing'),
    ('https://www.hsf.net/', 'hispanic_us'),
    ('https://www.forwomeninscience.com/', 'women_science'),
    ('https://www.lighthouseguild.org/college-bound-scholarship/', 'us_visual_impairment'),
    ('https://www.mandelarhodes.org/scholarship/', 'africa_postgrad'),
    ('https://www.mmeg.org/apply/eligibility', 'women_developing_countries'),
    ('https://www.metacareers.com/students/diversity/scholarship', 'underrep_cs'),
    ('https://www.microsoft.com/en-us/diversity/programs/scholarships', 'stem_diversity')
) AS demographic_data(_url, _demographic)
WHERE public.scholarship_sources.url = demographic_data._url
  AND public.scholarship_sources.parser_hint IS DISTINCT FROM
      ('[demographic_tagged: ' || _demographic || '] ' || COALESCE(public.scholarship_sources.parser_hint, ''))
  AND public.scholarship_sources.parser_hint NOT LIKE '[demographic_tagged:%';

-- ─────────────────────────────────────────────────────────────────────
-- D) Sanity-check the policy ran
-- These SELECTs surface to the migration log (printed but not consumed).
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_whitelist_count INT;
  v_killed_aggregators INT;
  v_demographic_tagged INT;
BEGIN
  SELECT COUNT(*) INTO v_whitelist_count
  FROM public.scholarship_sources
  WHERE source_tier = 'aggregator_discovery_only' AND is_active = true;

  SELECT COUNT(*) INTO v_killed_aggregators
  FROM public.scholarship_sources
  WHERE deactivation_reason = 'pass1_non_whitelist_aggregator';

  SELECT COUNT(*) INTO v_demographic_tagged
  FROM public.scholarship_sources
  WHERE parser_hint LIKE '[demographic_tagged:%';

  RAISE NOTICE 'Pass 1 policy applied. T3 whitelist active: %. T3 non-whitelist killed: %. Demographic-tagged: %.',
    v_whitelist_count, v_killed_aggregators, v_demographic_tagged;

  IF v_whitelist_count != 4 THEN
    RAISE WARNING 'Expected exactly 4 T3 whitelisted entries, found %. Audit doc + migration drift.', v_whitelist_count;
  END IF;
END $$;
