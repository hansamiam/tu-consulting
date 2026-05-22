-- Discover v1 — Phase A, source policy v1, Pass 2 — *** DRAFT — DO NOT APPLY ***
--
-- ████████████████████████████████████████████████████████████████████████
-- ██ DO NOT RUN THIS MIGRATION YET. Filename ends in _DRAFT.            ██
-- ██                                                                    ██
-- ██ Rename file to remove _DRAFT (and rename timestamp if needed) ONLY ██
-- ██ after user reviews docs/source_audit_2026-05-22.md §1.5 and        ██
-- ██ approves the 31-university keep list below.                        ██
-- ██                                                                    ██
-- ██ Why a draft: Pass 2 deactivates ~142 university entries — that's a ██
-- ██ brand-curation call where user judgment beats a rubric. Until      ██
-- ██ the keep list is locked, this migration MUST NOT execute.          ██
-- ████████████████████████████████████████████████████████████████████████
--
-- Policy: deactivate every scholarship_sources row where
--   category = 'university' AND is_active = true
--   AND url NOT IN (<keep_list>)
-- with deactivation_reason = 'pass2_over_granular_university_aid_page'.

UPDATE public.scholarship_sources
SET is_active = false,
    deactivation_reason = 'pass2_over_granular_university_aid_page',
    deactivated_at = now(),
    deactivation_policy_version = 'v1-2026-05-22',
    updated_at = now()
WHERE category = 'university'
  AND is_active = true
  AND url NOT IN (
    -- §1.5 keep list (31 entries) — proposed 2026-05-22, awaiting user OK.
    -- Edit this list to add / remove keepers, then remove _DRAFT from filename.

    -- UK
    'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
    'https://www.gatescambridge.org/',
    'https://www.cambridgetrust.org/',
    'https://www.cambridgetrust.org/scholarships/',
    'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search',
    'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/external/imperial-college-presidents-phd-scholarships/',
    'https://www.lse.ac.uk/study-at-lse/Graduate/fees-and-funding/Financial-Support',
    'https://www.weidenfeldhoffmann.org/',

    -- US flagships (named programs only — generic uni aid pages get cut)
    'https://knight-hennessy.stanford.edu/',
    'https://worldfellows.yale.edu/',
    'https://www.hks.harvard.edu/educational-programs/financial-aid',
    'https://spia.princeton.edu/admissions/financial-aid',
    'https://gradadmissions.mit.edu/costs-funding/financial-support',
    'https://ed.stanford.edu/financial-aid',
    'https://robertsonscholars.org/',

    -- China
    'https://www.schwarzmanscholars.org/',
    'https://yenchingacademy.pku.edu.cn/Programs/Admission.htm',

    -- Singapore + Hong Kong
    'https://lkyspp.nus.edu.sg/admissions/financial-aid',
    'https://cerg1.ugc.edu.hk/hkpfs/index.html',

    -- Canada + Australia
    'https://future.utoronto.ca/pearson/',
    'https://www.mcgill.ca/studentaid/scholarships-aid',
    'https://scholarships.unimelb.edu.au/awards/graduate-research-scholarships',

    -- Switzerland
    'https://www.epfl.ch/education/master/access-and-admission-criteria/financial-aid/',
    'https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html',

    -- Europe (Italy, Spain, France)
    'https://www.ie.edu/financial-aid/types-of-aid/',
    'https://www.unibocconi.eu/wps/wcm/connect/Bocconi/SitoPubblico_EN/Navigation+Tree/Home/Programs/Scholarships+and+fees/',
    'https://www.hec.edu/en/master-s-programs/financing-and-scholarships',
    'https://www.insead.edu/master-programmes/mba/financing/scholarships',
    'https://www.iese.edu/mba/admissions/financial-aid/',

    -- Sweden (medical)
    'https://education.ki.se/global-master-s-scholarships',

    -- Central Asia origin-side (NU + AUCA — strategic for CIS audience)
    'https://nu.edu.kz/admissions/international-students/financial-aid',
    'https://auca.kg/en/financial_aid/'
  );

-- Sanity log (RAISE NOTICE only — visible in supabase db push output)
DO $$
DECLARE
  v_killed INT;
  v_kept INT;
BEGIN
  SELECT COUNT(*) INTO v_killed
  FROM public.scholarship_sources
  WHERE category = 'university'
    AND deactivation_reason = 'pass2_over_granular_university_aid_page';

  SELECT COUNT(*) INTO v_kept
  FROM public.scholarship_sources
  WHERE category = 'university' AND is_active = true;

  RAISE NOTICE 'Pass 2 university policy applied. Killed: %. Kept active: %.', v_killed, v_kept;
END $$;
