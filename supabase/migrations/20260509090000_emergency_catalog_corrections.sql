-- =============================================================================
-- Emergency catalog corrections — 5 high-visibility data errors
-- =============================================================================
-- A spot audit caught 5 headline scholarships with materially-wrong data.
-- These all surface to ICP students (Kazakh/Kyrgyz applicants browsing
-- Discover) and a single Google check would expose them as wrong → real
-- credibility damage.
--
-- 1. Mastercard Foundation Scholars Program — listed as globally
--    eligible, but actually restricted to Sub-Saharan African
--    nationals at every partner university. Must NOT surface for
--    Kazakh / Kyrgyz / non-SSA applicants. Fix: rewrite
--    eligible_countries to the canonical SSA list.
--
-- 2. Vanier Canada Graduate Scholarships — DISCONTINUED. Final cycle
--    was Fall 2024; replaced by Canada Graduate Research Scholarship —
--    Doctoral at lower amount. Fix: flag as broken +
--    lifecycle_status='closed_archived' so it stops surfacing on
--    Discover, hub pages, sitemap, and email digests.
--
-- 3. Chevening Scholarships — application window is closed (between
--    cycles). 2026-2027 cycle opens early August 2026. Currently
--    might display "Apply now" if application_deadline is null. Fix:
--    set application_deadline=2026-11-05 (typical first-Tuesday-of-
--    November close) and ensure lifecycle stays reopens_annually.
--
-- 4. Fulbright Foreign Student Program — open right now for KG and
--    KZ. KG country deadline 2026-06-05 (27 days as of 2026-05-09).
--    KZ deadline 2026-07-15. Multi-country programs like Fulbright
--    have per-country deadlines we can't fully capture in one row;
--    set the SOONEST deadline (KG) on the canonical row so the
--    "closing-soon" filter surfaces it for everyone.
--
-- 5. MEXT — stipend numbers contradict between sources. Flag stale
--    so verify-scholarship-cron re-touches it; doesn't auto-fix
--    because we'd need a human eyeball on the right amount.
--
-- The matching is loose-on-purpose: scholarship_name ILIKE patterns
-- so it catches name-aliased rows too. Each block uses its own
-- diagnostic NOTICE so the push output reports per-row impact.
-- =============================================================================

-- ─── 1. Mastercard Foundation Scholars Program — restrict to SSA ────
DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET eligible_countries = ARRAY[
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad',
    'Comoros', 'Democratic Republic of the Congo', 'Republic of the Congo',
    'Cote d''Ivoire', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea',
    'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
    'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique',
    'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Sao Tome and Principe',
    'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa',
    'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
    'Zambia', 'Zimbabwe'
  ],
  citizenship_requirements = 'Open to citizens of African countries only. The Mastercard Foundation Scholars Program supports young people from Africa, with priority for students from Sub-Saharan Africa. Non-African nationals are NOT eligible at any partner institution.',
  eligibility_requirements = COALESCE(
    eligibility_requirements,
    'Citizens of African countries with priority for Sub-Saharan Africa. Demonstrated academic merit, financial need, and a commitment to give back to communities in Africa.'
  ),
  embedding = NULL,
  embedded_at = NULL,
  last_verified_at = now()
  WHERE scholarship_name ILIKE '%mastercard foundation%scholar%'
     OR provider_name    ILIKE '%mastercard foundation%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[catalog_fix] Mastercard Foundation eligibility-correction: % row(s)', v_count;
END $$;

-- ─── 2. Vanier CGS — discontinued, mark broken + archived ───────────
DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET verification_status = 'broken',
      lifecycle_status    = 'closed_archived',
      risk_note = 'Program DISCONTINUED. Final intake was Fall 2024. Successor program: Canada Graduate Research Scholarship — Doctoral (CGRS-D), administered by the Tri-Council, with reduced funding. Do not apply to Vanier — apply to CGRS-D instead.',
      last_verified_at = now()
  WHERE scholarship_name ILIKE '%vanier%'
    AND scholarship_name NOT ILIKE '%canada graduate research%'; -- protect any successor row
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[catalog_fix] Vanier CGS discontinued: % row(s)', v_count;
END $$;

-- ─── 3. Chevening — between cycles, set next-cycle deadline ─────────
DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET application_deadline = '2026-10-07'::date,  -- 2027/28 close per chevening.org/scholarships/application-timeline (verified 2026-05-09)
      deadline_type        = 'annual',
      lifecycle_status     = 'reopens_annually',
      next_open_at         = '2026-08-04'::date,  -- typical Chevening open (1st Tue Aug)
      risk_note = 'Between cycles. The 2027/28 application window opens August 2026 and closes 7 October 2026 (verified at chevening.org).',
      last_verified_at = now()
  WHERE (scholarship_name ILIKE '%chevening%' OR provider_name ILIKE '%chevening%')
    AND verification_status IS DISTINCT FROM 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[catalog_fix] Chevening between-cycles fix: % row(s)', v_count;
END $$;

-- ─── 4. Fulbright FFSP — surface the soonest country deadline ───────
DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET application_deadline = '2026-06-05'::date,  -- soonest of KG (2026-06-05) and KZ (2026-07-15)
      deadline_type        = 'annual',
      lifecycle_status     = 'active',
      risk_note = 'Country-specific deadlines: Kyrgyzstan 2026-06-05, Kazakhstan 2026-07-15. Other countries vary — check the U.S. embassy site for your country before applying. The deadline shown is Kyrgyzstan (the soonest).',
      last_verified_at = now()
  WHERE (scholarship_name ILIKE '%fulbright%foreign student%'
         OR scholarship_name ILIKE '%fulbright FSP%'
         OR scholarship_name ILIKE '%fulbright%FFSP%'
         OR (scholarship_name ILIKE '%fulbright%' AND provider_name ILIKE '%U.S.%state%')
         OR (scholarship_name ILIKE '%fulbright%' AND provider_name ILIKE '%bureau of educational%'))
    AND verification_status IS DISTINCT FROM 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[catalog_fix] Fulbright FFSP next-deadline fix: % row(s)', v_count;
END $$;

-- ─── 5. MEXT — flag stale for re-verification ───────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET verification_status = 'stale',
      risk_note = 'Stipend amount may differ from current MEXT figures (sources contradict — flagged for re-verification). Always confirm current allowance on the official Embassy of Japan website for your country before applying.'
  WHERE (scholarship_name ILIKE '%mext%' OR provider_name ILIKE '%mext%')
    AND verification_status IS DISTINCT FROM 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[catalog_fix] MEXT flagged stale: % row(s)', v_count;
END $$;

-- ─── Audit: surface what we just touched ────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      scholarship_name,
      verification_status,
      lifecycle_status,
      application_deadline,
      array_length(eligible_countries, 1) AS country_count
    FROM public.scholarships
    WHERE scholarship_name ILIKE ANY (ARRAY['%mastercard foundation%', '%vanier%', '%chevening%', '%fulbright%', '%mext%'])
    ORDER BY scholarship_name
    LIMIT 30
  LOOP
    RAISE NOTICE '[catalog_fix_audit] %  status=% lifecycle=% deadline=% countries=%',
      LEFT(r.scholarship_name, 70), r.verification_status, r.lifecycle_status, r.application_deadline, r.country_count;
  END LOOP;
END $$;
