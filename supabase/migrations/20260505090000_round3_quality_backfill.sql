-- =============================================================================
-- Round-3 quality backfill: citizenship miscategorisation, user-relative
-- phrasing, host_country pattern inference
-- =============================================================================
-- The user flagged three legacy data issues. The verify cron's progressive
-- self-clean will fix them all over a few days, but the initial pass below
-- compresses that to ONE migration:
--
--   1. citizenship_requirements set to a gender-only or category-only value
--      ("Women", "LGBTQ+", "First-generation"). These are real eligibility
--      gates but they're not citizenship gates — surface as country
--      requirement misleads. Until we have proper category fields, NULL
--      these out.
--   2. Soft-field text containing user-relative phrasing ("without leaving
--      the country", "students like you"). These read broken to anyone
--      not in the imagined audience. Strip the offending clauses from
--      why_this_fits / how_to_win / ideal_candidate_profile / etc.
--   3. host_country = NULL on rows where the provider name strongly implies
--      the country (KIMEP University → Kazakhstan, Karolinska → Sweden,
--      etc.). Pattern-match a small set of high-confidence inferences
--      so cards stop falling to the default fallback gradient + globe art.
-- =============================================================================

-- ─── 1. Citizenship miscategorisation ────────────────────────────────────────
-- Drop the field when it's ENTIRELY a gender / identity-category word.
-- Mixed values like "Women from Africa" stay (Africa IS a citizenship
-- constraint), only pure-category single-word values get cleared.
UPDATE public.scholarships
SET citizenship_requirements = NULL
WHERE citizenship_requirements IS NOT NULL
  AND btrim(citizenship_requirements) ~* '^(women|female applicants?|female|men|male applicants?|male|lgbtq[+]?|queer|trans|first-generation|first generation|low[- ]income|underrepresented|disabled|disability|indigenous|refugees?|displaced|veterans?)\.?$';

-- ─── 2. Strip user-relative phrasing from soft fields ────────────────────────
-- The patterns mirror src/lib/scholarshipFields.ts stripUserRelative + the
-- _shared mirror. SQL regex_replace can't do PCRE-style alternation in one
-- pass cleanly, so we run several targeted replacements per field.
DO $$
DECLARE
  fld text;
  fields text[] := ARRAY[
    'why_this_fits', 'how_to_win', 'ideal_candidate_profile',
    'what_to_prepare_first', 'strategy_notes', 'weak_candidate_warning'
  ];
  patterns text[] := ARRAY[
    '\s*[,—;.]?\s*without leaving (the|your) country',
    '\s*[,—;.]?\s*without (having to )?leaving home',
    '\s*[,—;.]?\s*for students like you(rself)?',
    '\s*[,—;.]?\s*for applicants like you(rself)?',
    '\s*[,—;.]?\s*international students like yourself',
    '\s*[,—;.]?\s*in your (situation|case|position)',
    '\s*[,—;.]?\s*given your (background|profile|situation)',
    '\s*[,—;.]?\s*applicants from your (region|country|background)',
    '\s*[,—;.]?\s*from your home country',
    '\s*[,—;.]?\s*back home'
  ];
  pat text;
BEGIN
  FOREACH fld IN ARRAY fields LOOP
    FOREACH pat IN ARRAY patterns LOOP
      EXECUTE format(
        $f$ UPDATE public.scholarships
            SET %1$I = NULLIF(btrim(regexp_replace(%1$I, %2$L, '', 'gi')), '')
            WHERE %1$I IS NOT NULL AND %1$I ~* %2$L $f$,
        fld, pat
      );
    END LOOP;
    -- Tidy double-punctuation + collapse whitespace
    EXECUTE format(
      $f$ UPDATE public.scholarships
          SET %1$I = NULLIF(btrim(
            regexp_replace(
              regexp_replace(%1$I, '\s+([.,;!?])', '\1', 'g'),
              '\s{2,}', ' ', 'g'
            )
          ), '')
          WHERE %1$I IS NOT NULL $f$,
      fld
    );
    -- Drop field if cleaned result is too short to be useful
    EXECUTE format(
      $f$ UPDATE public.scholarships
          SET %1$I = NULL
          WHERE %1$I IS NOT NULL AND length(btrim(%1$I)) < 8 $f$,
      fld
    );
  END LOOP;
END;
$$;

-- ─── 3. host_country backfill from provider name patterns ────────────────────
-- Only fire when host_country is NULL/empty. Conservative pattern matches —
-- only well-known anchors that uniquely identify a country.
UPDATE public.scholarships SET host_country = 'Kazakhstan'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%KIMEP%' OR provider_name ILIKE '%Nazarbayev%'
    OR provider_name ILIKE '%Astana IT University%'
    OR provider_name ILIKE '%Bolashak%'
  );

UPDATE public.scholarships SET host_country = 'Sweden'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Karolinska%' OR provider_name ILIKE '%KTH Royal%'
    OR provider_name ILIKE '%Lund University%' OR provider_name ILIKE '%Uppsala%'
    OR provider_name ILIKE '%Chalmers%' OR provider_name ILIKE '%Stockholm%'
    OR provider_name ILIKE '%Swedish Institute%'
  );

UPDATE public.scholarships SET host_country = 'Germany'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%DAAD%' OR provider_name ILIKE '%Heinrich Böll%'
    OR provider_name ILIKE '%Konrad-Adenauer%' OR provider_name ILIKE '%Friedrich Ebert%'
    OR provider_name ILIKE '%TU Munich%' OR provider_name ILIKE '%TUM%'
    OR provider_name ILIKE '%Heidelberg%' OR provider_name ILIKE '%RWTH%'
    OR provider_name ILIKE '%Humboldt%' OR provider_name ILIKE '%Max Planck%'
    OR provider_name ILIKE '%Berlin%' OR provider_name ILIKE '%Hamburg%'
  );

UPDATE public.scholarships SET host_country = 'United Kingdom'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Cambridge%' OR provider_name ILIKE '%Oxford%'
    OR provider_name ILIKE '%Imperial College%' OR provider_name ILIKE '%LSE%'
    OR provider_name ILIKE '%Chevening%' OR provider_name ILIKE '%Commonwealth%'
    OR provider_name ILIKE '%University College London%' OR provider_name ILIKE '%UCL%'
    OR provider_name ILIKE '%Edinburgh%' OR provider_name ILIKE '%King''s College London%'
    OR provider_name ILIKE '%Manchester%' OR provider_name ILIKE '%Bristol%'
    OR provider_name ILIKE '%Warwick%' OR provider_name ILIKE '%Gates Cambridge%'
  );

UPDATE public.scholarships SET host_country = 'United States'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%MIT%' OR provider_name ILIKE '%Harvard%'
    OR provider_name ILIKE '%Stanford%' OR provider_name ILIKE '%Yale%'
    OR provider_name ILIKE '%Princeton%' OR provider_name ILIKE '%Columbia%'
    OR provider_name ILIKE '%Berkeley%' OR provider_name ILIKE '%UCLA%'
    OR provider_name ILIKE '%University of Chicago%' OR provider_name ILIKE '%Cornell%'
    OR provider_name ILIKE '%Duke%' OR provider_name ILIKE '%Brown University%'
    OR provider_name ILIKE '%Knight-Hennessy%' OR provider_name ILIKE '%Fulbright%'
    OR provider_name ILIKE '%American University%' OR provider_name ILIKE '%Clark University%'
    OR provider_name ILIKE '%CMU%' OR provider_name ILIKE '%Carnegie Mellon%'
    OR provider_name ILIKE '%Northwestern%' OR provider_name ILIKE '%Johns Hopkins%'
  );

UPDATE public.scholarships SET host_country = 'Canada'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Toronto%' OR provider_name ILIKE '%McGill%'
    OR provider_name ILIKE '%UBC%' OR provider_name ILIKE '%University of British Columbia%'
    OR provider_name ILIKE '%Waterloo%' OR provider_name ILIKE '%Vanier%'
    OR provider_name ILIKE '%Trudeau Foundation%'
  );

UPDATE public.scholarships SET host_country = 'France'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Sorbonne%' OR provider_name ILIKE '%Sciences Po%'
    OR provider_name ILIKE '%HEC Paris%' OR provider_name ILIKE '%Eiffel%'
    OR provider_name ILIKE '%École%' OR provider_name ILIKE '%Ecole Polytechnique%'
    OR provider_name ILIKE '%INSEAD%'
  );

UPDATE public.scholarships SET host_country = 'Netherlands'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Erasmus%' OR provider_name ILIKE '%Leiden%'
    OR provider_name ILIKE '%Wageningen%' OR provider_name ILIKE '%Delft%'
    OR provider_name ILIKE '%Utrecht%' OR provider_name ILIKE '%Holland Scholarship%'
  );

UPDATE public.scholarships SET host_country = 'Switzerland'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%ETH Zurich%' OR provider_name ILIKE '%EPFL%'
    OR provider_name ILIKE '%Swiss Government%' OR provider_name ILIKE '%University of Zurich%'
  );

UPDATE public.scholarships SET host_country = 'Japan'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%MEXT%' OR provider_name ILIKE '%University of Tokyo%'
    OR provider_name ILIKE '%Kyoto University%' OR provider_name ILIKE '%Waseda%'
    OR provider_name ILIKE '%Keio%' OR provider_name ILIKE '%JASSO%'
    OR provider_name ILIKE '%Japan Foundation%'
  );

UPDATE public.scholarships SET host_country = 'South Korea'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%KAIST%' OR provider_name ILIKE '%Seoul National%'
    OR provider_name ILIKE '%KGSP%' OR provider_name ILIKE '%Korean Government%'
    OR provider_name ILIKE '%POSTECH%' OR provider_name ILIKE '%Yonsei%'
  );

UPDATE public.scholarships SET host_country = 'Singapore'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%NUS%' OR provider_name ILIKE '%National University of Singapore%'
    OR provider_name ILIKE '%NTU Singapore%' OR provider_name ILIKE '%Nanyang Technological%'
  );

UPDATE public.scholarships SET host_country = 'China'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Tsinghua%' OR provider_name ILIKE '%Peking University%'
    OR provider_name ILIKE '%Schwarzman%' OR provider_name ILIKE '%CSC%'
    OR provider_name ILIKE '%Chinese Government%' OR provider_name ILIKE '%Yenching%'
  );

UPDATE public.scholarships SET host_country = 'Australia'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Melbourne%' OR provider_name ILIKE '%University of Sydney%'
    OR provider_name ILIKE '%ANU%' OR provider_name ILIKE '%Australian National University%'
    OR provider_name ILIKE '%Monash%' OR provider_name ILIKE '%UNSW%'
    OR provider_name ILIKE '%Endeavour%'
  );

-- Touch updated_at to invalidate the deep-dive cache for any backfilled rows.
UPDATE public.scholarships
SET updated_at = now()
WHERE updated_at < now() - interval '1 minute';
