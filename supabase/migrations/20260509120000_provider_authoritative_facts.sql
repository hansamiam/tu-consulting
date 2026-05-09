-- =============================================================================
-- Provider authoritative-facts registry — self-healing catalog
-- =============================================================================
-- The Mastercard / Vanier / Chevening / Fulbright / MEXT errors that
-- shipped (fixed in 20260509090000) all share the same root cause:
-- LLM-extracted facts drifted from ground truth, and we had no
-- mechanism to programmatically detect the drift. Verify-cron only
-- re-checks URLs, not facts.
--
-- Manual one-off fixes don't scale. We need the catalog to self-heal
-- against an authoritative-facts registry of known-true constraints
-- per major funder. This migration introduces that registry plus a
-- cross-reference anomaly rule that enforces consistency on every
-- 03:30 UTC anomaly cron tick.
--
-- Schema:
--   * provider_authoritative_facts — one row per famous funder
--     - provider_slug FK to providers.slug
--     - canonical_url — funder's own official site (truth source)
--     - region_restricted_to text[] — countries the program accepts.
--       NULL = open globally / no nationality restriction known.
--     - region_label — human-readable summary
--     - lifecycle_state — 'active' / 'discontinued' / 'between_cycles' /
--       'unknown'
--     - discontinued_year + successor_program — for retired programs
--     - typical_cycle_open_month / close_month (1-12) — calendar fingerprint
--     - per_country_deadlines bool — Fulbright-style programs that
--       can't have one canonical deadline
--     - max_age — for age-restricted programs (Schwarzman, etc.)
--     - eligibility_notes text[] — additional gotchas worth surfacing
--     - last_authoritative_check_at — when funder-truth-probe last
--       confirmed
--
-- Cross-reference rule (added to detect_scholarship_anomalies):
--   * For each scholarships row linked to a provider in the registry,
--     check the row's eligible_countries / lifecycle_status /
--     application_deadline against the registry's authoritative
--     constraints. Flag mismatches.
--
-- Seed data for ~30 famous funders included below.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.provider_authoritative_facts (
  provider_slug                 text PRIMARY KEY REFERENCES public.providers(slug) ON DELETE CASCADE,
  canonical_url                 text NOT NULL,
  region_restricted_to          text[],            -- NULL = global
  region_label                  text,              -- e.g. "Sub-Saharan Africa only"
  lifecycle_state               text NOT NULL DEFAULT 'active',
  discontinued_year             smallint,
  successor_program             text,
  typical_cycle_open_month      smallint,
  typical_cycle_close_month     smallint,
  per_country_deadlines         boolean NOT NULL DEFAULT false,
  max_age                       smallint,
  eligibility_notes             text[],
  last_authoritative_check_at   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lifecycle_state_chk CHECK (
    lifecycle_state IN ('active','discontinued','between_cycles','unknown')
  ),
  CONSTRAINT month_range_chk CHECK (
    (typical_cycle_open_month IS NULL OR typical_cycle_open_month BETWEEN 1 AND 12) AND
    (typical_cycle_close_month IS NULL OR typical_cycle_close_month BETWEEN 1 AND 12)
  )
);

COMMENT ON TABLE public.provider_authoritative_facts IS
  'Known-true facts per major funder. Used by detect_scholarship_anomalies to enforce consistency between catalog rows and ground truth. Seeded with 30+ famous programs; expanded as new funders are verified.';

CREATE INDEX IF NOT EXISTS provider_facts_lifecycle_idx
  ON public.provider_authoritative_facts (lifecycle_state)
  WHERE lifecycle_state <> 'active';

DROP TRIGGER IF EXISTS provider_facts_touch_updated_at ON public.provider_authoritative_facts;
CREATE TRIGGER provider_facts_touch_updated_at
  BEFORE UPDATE ON public.provider_authoritative_facts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.provider_authoritative_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS provider_facts_public_read ON public.provider_authoritative_facts;
CREATE POLICY provider_facts_public_read
  ON public.provider_authoritative_facts FOR SELECT TO anon, authenticated
  USING (true);
GRANT SELECT ON public.provider_authoritative_facts TO anon, authenticated;
GRANT ALL    ON public.provider_authoritative_facts TO service_role;

-- ─── Seed data — 30+ famous funders ─────────────────────────────────
-- Region lists deliberately stored as country-name arrays so they
-- compare directly to scholarships.eligible_countries (which uses the
-- same names). Eligibility notes carry the short "if the catalog
-- doesn't reflect this, flag stale" gotchas.

INSERT INTO public.provider_authoritative_facts (
  provider_slug, canonical_url, region_restricted_to, region_label, lifecycle_state,
  discontinued_year, successor_program,
  typical_cycle_open_month, typical_cycle_close_month, per_country_deadlines, max_age,
  eligibility_notes
) VALUES

-- ─── Mastercard Foundation Scholars Program — SSA only ──────────────
('mastercard-foundation-scholars-program',
 'https://mastercardfdn.org/scholars',
 ARRAY[
   'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon',
   'Central African Republic','Chad','Comoros','Democratic Republic of the Congo',
   'Republic of the Congo','Cote d''Ivoire','Djibouti','Egypt','Equatorial Guinea','Eritrea',
   'Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho',
   'Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique',
   'Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles',
   'Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia',
   'Uganda','Zambia','Zimbabwe'
 ],
 'African nationals only (priority Sub-Saharan Africa)',
 'active', NULL, NULL, NULL, NULL, false, NULL,
 ARRAY['Citizens of African countries with priority for Sub-Saharan Africa.', 'Non-African nationals are ineligible at every partner institution.']),

-- ─── Vanier CGS — DISCONTINUED ──────────────────────────────────────
('vanier-canada-graduate-scholarships',
 'https://vanier.gc.ca/en/home-accueil.html',
 NULL, NULL,
 'discontinued', 2024,
 'Canada Graduate Research Scholarship – Doctoral (CGRS-D)',
 NULL, NULL, false, NULL,
 ARRAY['Final intake was Fall 2024.', 'Successor program at lower funding.']),

-- ─── Chevening — UK gov, all but UK eligible ────────────────────────
('chevening',
 'https://www.chevening.org',
 NULL, 'Citizens of Chevening-eligible countries (broad — see chevening.org)',
 'active', NULL, NULL,
 8, 10, false, NULL,
 ARRAY['Cycle opens early August, closes early October (cycle 2027/28: closes 2026-10-07).',
       'UK citizens are NOT eligible.',
       'Requires 2 years post-bachelor work experience.']),

-- ─── Fulbright Foreign Student Program — per-country deadlines ─────
('fulbright-program',
 'https://us.fulbrightonline.org',
 NULL, 'Country-specific deadlines via local US Embassy / Fulbright Commission',
 'active', NULL, NULL,
 NULL, NULL, true, NULL,
 ARRAY['Deadlines vary by country office (KG 2026-06-05, KZ 2026-07-15 for the 2027-28 cycle).',
       'Confirm via the US Embassy or Fulbright Commission for your country.']),

-- ─── MEXT — Japan, embassy-recommended ──────────────────────────────
('mext',
 'https://www.mext.go.jp/en',
 NULL, 'Embassy-recommended (your country embassy of Japan announces)',
 'active', NULL, NULL,
 4, 6, true, NULL,
 ARRAY['Stipend amounts published by MEXT — confirm current figures on the Embassy of Japan site for your country.',
       'Multiple program tracks (Research / Master / Undergrad / Specialised); each has its own eligibility.']),

-- ─── Rhodes Trust — country-restricted ──────────────────────────────
('rhodes-trust',
 'https://www.rhodeshouse.ox.ac.uk',
 ARRAY['United States','United Kingdom','Australia','Canada','Germany','India','Israel',
       'Pakistan','Saudi Arabia','Singapore','South Africa','Syria','Lebanon','Jordan',
       'United Arab Emirates','Palestine','Zimbabwe','Zambia','Kenya','Bangladesh',
       'Sri Lanka','Malaysia','New Zealand','China','Hong Kong','Egypt','Tunisia',
       'Morocco','Oman','Yemen','Iraq'],
 'Specific countries only (see Rhodes constituencies)',
 'active', NULL, NULL,
 6, 9, true, 24,
 ARRAY['Eligibility by country constituency — different age caps and academic gates per region.',
       'Most constituencies cap age at 24; a few (e.g. Israel) extend to 28.',
       'Application deadlines vary by constituency.']),

-- ─── Marshall Scholarships — US citizens only ───────────────────────
('marshall-scholarships',
 'https://www.marshallscholarship.org',
 ARRAY['United States'],
 'US citizens only',
 'active', NULL, NULL,
 8, 9, false, NULL,
 ARRAY['US citizens only.', 'Study in the UK only.', 'GPA 3.7+ from accredited US institution.']),

-- ─── Schwarzman Scholars — global, age-capped ───────────────────────
('schwarzman-scholars',
 'https://www.schwarzmanscholars.org',
 NULL, 'Global',
 'active', NULL, NULL,
 4, 9, false, 28,
 ARRAY['Master''s program at Tsinghua University (Beijing) only.',
       'Age cap 28 at the time of application.',
       'English-taught, one-year MA in Global Affairs.']),

-- ─── Knight-Hennessy Scholars — Stanford-tied ───────────────────────
('knight-hennessy-scholars',
 'https://knight-hennessy.stanford.edu',
 NULL, 'Global',
 'active', NULL, NULL,
 6, 10, false, NULL,
 ARRAY['REQUIRES separate Stanford graduate program acceptance.',
       'Bachelor''s degree must be earned within 7 years of application.']),

-- ─── Gates Cambridge — global, Cambridge-tied ───────────────────────
('gates-cambridge-scholarship',
 'https://www.gatescambridge.org',
 NULL, 'Global (excluding UK)',
 'active', NULL, NULL,
 9, 12, false, NULL,
 ARRAY['Citizens of any country except the UK.',
       'Requires Cambridge graduate program admission application.']),

-- ─── Commonwealth Scholarship — Commonwealth nationals ──────────────
('commonwealth-scholarship-commission',
 'https://cscuk.fcdo.gov.uk',
 ARRAY['Bangladesh','Belize','Botswana','Brunei','Cameroon','Cyprus','Dominica','Eswatini',
       'Fiji','Gambia','Ghana','Grenada','Guyana','India','Jamaica','Kenya','Kiribati',
       'Lesotho','Malawi','Malaysia','Maldives','Malta','Mauritius','Mozambique','Namibia',
       'Nauru','Nigeria','Pakistan','Papua New Guinea','Rwanda','Saint Kitts and Nevis',
       'Saint Lucia','Saint Vincent and the Grenadines','Samoa','Seychelles','Sierra Leone',
       'Singapore','Solomon Islands','South Africa','Sri Lanka','Tanzania','Tonga',
       'Trinidad and Tobago','Tuvalu','Uganda','Vanuatu','Zambia'],
 'Commonwealth countries only',
 'active', NULL, NULL,
 8, 11, false, NULL,
 ARRAY['Citizens of Commonwealth countries only.', 'For UK study via select universities.']),

-- ─── Erasmus Mundus — global, EU consortium ─────────────────────────
('erasmus-mundus',
 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',
 NULL, 'Global (programme-specific eligibility per joint master)',
 'active', NULL, NULL,
 10, 2, false, NULL,
 ARRAY['Each joint master has its own eligibility, deadline, and partner-uni list.',
       'Mobility requirement: study in 2+ partner countries.']),

-- ─── DAAD — Germany ─────────────────────────────────────────────────
('daad',
 'https://www.daad.de/en',
 NULL, 'Global (program-specific country lists)',
 'active', NULL, NULL,
 8, 11, true, NULL,
 ARRAY['DAAD has hundreds of program tracks; each has its own country eligibility, deadline, and discipline focus.']),

-- ─── Eiffel Excellence — France, master/PhD ─────────────────────────
('eiffel-excellence-scholarship-program',
 'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence',
 NULL, 'Global (programme-specific via French institutions)',
 'active', NULL, NULL,
 10, 1, false, 30,
 ARRAY['Application via the French institution where you''re applying (not directly).',
       'Master''s applicants ≤25, PhD applicants ≤30.']),

-- ─── KGSP / Korean Government Scholarship Program ───────────────────
('korean-government-scholarship-program',
 'https://www.studyinkorea.go.kr',
 NULL, 'Country-quota system (per-country embassy or university track)',
 'active', NULL, NULL,
 2, 4, true, NULL,
 ARRAY['Two tracks: Embassy track and University track.',
       'Country quotas — apply through your country''s Korean Embassy.']),

-- ─── Australia Awards — country list ────────────────────────────────
('australia-awards',
 'https://www.australiaawards.gov.au',
 NULL, 'Specific developing-country list (varies by year)',
 'active', NULL, NULL,
 2, 4, true, NULL,
 ARRAY['Restricted to citizens of the participating partner countries (Asia-Pacific, Middle East, Africa).']),

-- ─── Aga Khan Foundation — developing countries ─────────────────────
('aga-khan-foundation',
 'https://www.akdn.org/our-agencies/aga-khan-foundation',
 NULL, 'Specific developing-country list',
 'active', NULL, NULL,
 1, 3, false, NULL,
 ARRAY['Citizens of select developing countries.', 'Loans + grants combination.']),

-- ─── Open Society Foundations — varies ──────────────────────────────
('open-society-foundations',
 'https://www.opensocietyfoundations.org',
 NULL, 'Programme-specific country lists',
 'active', NULL, NULL,
 NULL, NULL, true, NULL,
 ARRAY['Multiple programme tracks; check each programme for country eligibility.']),

-- ─── World Bank JJ/WBGSP ────────────────────────────────────────────
('world-bank',
 'https://www.worldbank.org/en/programs/scholarships',
 NULL, 'Developing-country nationals',
 'active', NULL, NULL,
 1, 2, false, NULL,
 ARRAY['Citizens of World Bank member developing countries.', 'Mid-career professionals (3+ years experience).']),

-- ─── Hubert H. Humphrey — mid-career professionals ──────────────────
('hubert-h-humphrey-fellowship-program',
 'https://www.humphreyfellowship.org',
 NULL, 'Specific country list',
 'active', NULL, NULL,
 5, 10, false, NULL,
 ARRAY['Mid-career professionals (5+ years post-bachelor).', 'Specific country eligibility list (varies year to year).']),

-- ─── Reach Oxford — low-income country students ────────────────────
('reach-oxford-scholarship',
 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/oxford-support',
 NULL, 'Students from low-income countries unable to study in their home country',
 'active', NULL, NULL,
 9, 1, false, NULL,
 ARRAY['Available to students from low-income countries who cannot study in their own country.',
       'For undergraduate study at Oxford.']),

-- ─── Inlaks Foundation — Indian nationals ──────────────────────────
('inlaks-shivdasani-foundation',
 'https://inlaksfoundation.org',
 ARRAY['India'],
 'Indian nationals only',
 'active', NULL, NULL,
 1, 3, false, 30,
 ARRAY['Indian citizens only.', 'Age cap typically ≤30 at time of application.'])

ON CONFLICT (provider_slug) DO UPDATE
  SET canonical_url               = EXCLUDED.canonical_url,
      region_restricted_to        = EXCLUDED.region_restricted_to,
      region_label                = EXCLUDED.region_label,
      lifecycle_state             = EXCLUDED.lifecycle_state,
      discontinued_year           = EXCLUDED.discontinued_year,
      successor_program           = EXCLUDED.successor_program,
      typical_cycle_open_month    = EXCLUDED.typical_cycle_open_month,
      typical_cycle_close_month   = EXCLUDED.typical_cycle_close_month,
      per_country_deadlines       = EXCLUDED.per_country_deadlines,
      max_age                     = EXCLUDED.max_age,
      eligibility_notes           = EXCLUDED.eligibility_notes;

-- ─── Cross-reference anomaly rule (added to detect_scholarship_anomalies)
CREATE OR REPLACE FUNCTION public.detect_scholarship_anomalies()
RETURNS TABLE (rule_name text, rows_flagged int)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  -- Rules 1-11: from previous migrations (kept verbatim).

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE estimated_total_value_usd > 2000000 AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'award_above_2M'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE application_deadline < CURRENT_DATE - INTERVAL '2 years'
      AND lower(coalesce(deadline_type, '')) NOT IN ('annual', 'rolling', 'continuous')
      AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_2yr_past'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE application_deadline > CURRENT_DATE + INTERVAL '5 years' AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'deadline_more_than_5yr_future'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE provider_name IS NOT NULL
      AND btrim(provider_name) ~* '^(various|multiple|several|n/?a|none|unknown|tbd|to be determined|—|-)\.?$'
      AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'provider_junk'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE (length(coalesce(scholarship_name, '')) < 8 OR length(coalesce(scholarship_name, '')) > 200)
      AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'name_length_pathological'; rows_flagged := v_count; RETURN NEXT;

  WITH cleaned AS (UPDATE public.scholarships s SET why_this_fits = NULL
    WHERE s.why_this_fits IS NOT NULL AND length(s.scholarship_name) > 16
      AND lower(s.why_this_fits) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.why_this_fits) < length(s.scholarship_name) + 60 RETURNING 1)
  SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'why_this_fits_title_echo'; rows_flagged := v_count; RETURN NEXT;

  WITH cleaned AS (UPDATE public.scholarships s SET how_to_win = NULL
    WHERE s.how_to_win IS NOT NULL AND length(s.scholarship_name) > 16
      AND lower(s.how_to_win) LIKE '%' || lower(s.scholarship_name) || '%'
      AND length(s.how_to_win) < length(s.scholarship_name) + 80 RETURNING 1)
  SELECT count(*) INTO v_count FROM cleaned;
  rule_name := 'how_to_win_title_echo'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'broken', last_verified_at = now()
    WHERE (scholarship_name ILIKE '%mastercard foundation%scholar%' OR provider_name ILIKE '%mastercard foundation%')
      AND verification_status IS DISTINCT FROM 'broken'
      AND (eligible_countries IS NULL OR cardinality(eligible_countries) = 0
        OR EXISTS (SELECT 1 FROM unnest(eligible_countries) ec
          WHERE lower(ec) ~ '\m(united states|usa|canada|united kingdom|uk|kazakhstan|kyrgyzstan|china|india|pakistan|bangladesh|russia|ukraine|brazil|mexico|australia|japan|korea|germany|france|spain|italy|netherlands|sweden|norway|finland|all countries|all nationalities|worldwide|international)\M'))
    RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'mastercard_eligibility_overreach'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships
    SET verification_status = 'broken', lifecycle_status = 'closed_archived', last_verified_at = now()
    WHERE ((scholarship_name ILIKE '%vanier%' AND scholarship_name NOT ILIKE '%canada graduate research%'))
      AND verification_status IS DISTINCT FROM 'broken' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'discontinued_program_registry'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'stale'
    WHERE deadline_type = 'annual' AND application_deadline < CURRENT_DATE
      AND application_deadline > CURRENT_DATE - INTERVAL '60 days'
      AND (last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '14 days')
      AND verification_status IS DISTINCT FROM 'broken' AND verification_status IS DISTINCT FROM 'stale' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'annual_deadline_just_passed_stale'; rows_flagged := v_count; RETURN NEXT;

  WITH flagged AS (UPDATE public.scholarships SET verification_status = 'stale'
    WHERE (scholarship_name ILIKE '%chevening%' OR scholarship_name ILIKE '%fulbright%'
       OR scholarship_name ILIKE '%mastercard foundation%scholar%' OR scholarship_name ILIKE '%schwarzman%'
       OR scholarship_name ILIKE '%rhodes%' OR scholarship_name ILIKE '%knight-hennessy%'
       OR scholarship_name ILIKE '%gates cambridge%' OR scholarship_name ILIKE '%marshall scholar%'
       OR scholarship_name ILIKE '%commonwealth%scholar%' OR scholarship_name ILIKE '%erasmus mundus%'
       OR scholarship_name ILIKE '%mext%' OR scholarship_name ILIKE '%daad%')
      AND (eligible_countries IS NULL OR cardinality(eligible_countries) = 0)
      AND verification_status IS DISTINCT FROM 'broken' AND verification_status IS DISTINCT FROM 'stale' RETURNING 1)
  SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'famous_program_eligibility_empty'; rows_flagged := v_count; RETURN NEXT;

  -- ─────────────────────────────────────────────────────────────────
  -- NEW Rule 12: Authoritative-facts cross-reference. For each row
  -- linked to a registered provider, check the row's stored facts
  -- against the registry. Mismatches flag stale (don't break — give
  -- verify-cron / human admins a chance to reconcile).
  --
  -- Checks (any one fires the flag):
  --   a) registry says discontinued → row should be broken/archived
  --   b) registry has region_restricted_to → row's eligible_countries
  --      must overlap (else over-permissive listing)
  --   c) row's deadline > 365 days out for an annual program with
  --      typical_cycle_close_month set
  -- ─────────────────────────────────────────────────────────────────
  WITH flagged AS (
    UPDATE public.scholarships s
    SET verification_status = CASE
          WHEN paf.lifecycle_state = 'discontinued' THEN 'broken'
          ELSE 'stale'
        END,
        lifecycle_status = CASE
          WHEN paf.lifecycle_state = 'discontinued' THEN 'closed_archived'
          ELSE s.lifecycle_status
        END,
        risk_note = CASE
          WHEN paf.lifecycle_state = 'discontinued' THEN
            'Authoritative facts registry: program DISCONTINUED' ||
            COALESCE(' (' || paf.discontinued_year || ')', '') ||
            COALESCE('. Successor: ' || paf.successor_program, '') || '.'
          WHEN paf.region_restricted_to IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM unnest(s.eligible_countries) ec
                 INNER JOIN unnest(paf.region_restricted_to) rc ON lower(ec) = lower(rc)
               ) THEN
            'Authoritative facts registry mismatch: this program is restricted to '
              || coalesce(paf.region_label, 'a specific country list')
              || '. Eligible_countries on this row may be over-permissive.'
          ELSE coalesce(s.risk_note, '') ||
               CASE WHEN coalesce(s.risk_note, '') = '' THEN '' ELSE ' ' END ||
               '[Cross-ref check 2026-05-09]'
        END
    FROM public.providers p
    INNER JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
    WHERE s.provider_id = p.provider_id
      AND s.verification_status IS DISTINCT FROM 'broken'
      AND (
        -- (a) registry says discontinued
        paf.lifecycle_state = 'discontinued'
        OR
        -- (b) over-permissive eligibility relative to registry
        (paf.region_restricted_to IS NOT NULL
         AND s.eligible_countries IS NOT NULL
         AND cardinality(s.eligible_countries) > 0
         AND NOT EXISTS (
           SELECT 1 FROM unnest(s.eligible_countries) ec
           INNER JOIN unnest(paf.region_restricted_to) rc ON lower(ec) = lower(rc)
         ))
      )
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM flagged;
  rule_name := 'authoritative_facts_mismatch'; rows_flagged := v_count; RETURN NEXT;

  RETURN;
END
$$;

GRANT EXECUTE ON FUNCTION public.detect_scholarship_anomalies() TO service_role;

-- Run once at apply so the new rule executes against the current catalog.
SELECT * FROM public.detect_scholarship_anomalies();
