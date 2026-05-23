-- ============================================================================
-- Migration: 20260522180000_seed_pass2_keeplist_additions
-- Purpose:   Seed the 13 missing scholarship_sources rows surfaced by the
--            2026-05-22 §1.5 audit expansion. Pre-flight for Pass 2 cuts.
-- Spec:      docs/source_audit_2026-05-22.md §1.5a / §1.5b
-- Risk:      Additive only. No deactivations, no schema changes.
-- ============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── UK ────────────────────────────────────────────────────────────────
  ('Weidenfeld-Hoffmann Trust Scholarships',
   'https://www.weidenfeldhoffmann.org/scholarships/',
   'html', 'UK', 'university', 168,
   'Oxford-based; non-EU/UK; one-year master''s focus.'),

  -- ── US ────────────────────────────────────────────────────────────────
  ('A.B. Duke (Angier B. Duke) Scholarship',
   'https://ousf.duke.edu/merit-scholarships/',
   'html', 'US', 'university', 168,
   'Duke flagship undergrad merit; 15/yr; full ride + Oxford summer; distinct from Robertson.'),

  ('Danforth Scholars Program (WashU)',
   'https://admissions.washu.edu/danforth-scholars-program/',
   'html', 'US', 'university', 168,
   'Washington University in St. Louis flagship merit; full tuition + $2,500 stipend.'),

  ('Morehead-Cain Scholarship (UNC Chapel Hill)',
   'https://www.moreheadcain.org/',
   'html', 'US', 'university', 168,
   'First US merit scholarship (1945); full ride + 4 funded summers; 3% admit.'),

  ('Jefferson Scholars (UVA)',
   'https://www.jeffersonscholars.org/',
   'html', 'US', 'university', 168,
   'UVA foundation flagship; full ride + summer travel; multi-program.'),

  ('AU Emerging Global Leader Scholarship (EGLS)',
   'https://www.american.edu/admissions/international/au-egls-10-years.cfm',
   'html', 'US', 'university', 168,
   'American University DC; targets international students returning home as leaders. AU is ~rank 70-90 globally; audience-fit exception to the top-50 rule.'),

  -- ── Hong Kong ─────────────────────────────────────────────────────────
  ('HKU Presidential PhD Scholarship',
   'https://gradsch.hku.hk/prospective_students/fees_scholarships_and_financial_support/hku_presidential_phd_scholar_programme',
   'html', 'Hong Kong', 'university', 168,
   'HK$439,500/yr first year; pairs with HKPFS recipients from 2026/27+.'),

  ('HKUST RedBird PhD Award',
   'https://fytgs.hkust.edu.hk/node/28',
   'html', 'Hong Kong', 'university', 168,
   'HKUST PhD recruitment award; HK$40k + HK$20k/yr top-up on stipend.'),

  -- ── Canada ────────────────────────────────────────────────────────────
  ('McCall MacBain Scholarships (McGill)',
   'https://mccallmacbainscholars.org/',
   'html', 'Canada', 'university', 168,
   'Canada''s largest leadership-based grad scholarship; $200M endowment; ~30 scholars/yr; full ride + $2,300/mo.'),

  -- ── Australia ─────────────────────────────────────────────────────────
  ('ANU University Research Scholarship (URS)',
   'https://study.anu.edu.au/scholarships/find-scholarship/anu-university-research-scholarships',
   'html', 'Australia', 'university', 168,
   'AUD $39,069/yr stipend + tuition fee scholarship + travel allowance; research PG.'),

  -- ── Netherlands ───────────────────────────────────────────────────────
  ('Maastricht University NL-High Potential Scholarship',
   'https://www.maastrichtuniversity.nl/studeren/toelating-inschrijving/financing-your-studies/scholarships/maastricht-university-nl-high',
   'html', 'Netherlands', 'university', 168,
   'Non-EU master''s; 21 full @ €34,000/yr; 2% admit.'),

  ('Radboud Scholarship Programme (RSP)',
   'https://www.ru.nl/en/education/scholarships/radboud-scholarship-programme',
   'html', 'Netherlands', 'university', 168,
   '§1.5b PARTIAL COVERAGE: reduces tuition to €2,694 + visa + insurance; living costs NOT covered. Sub-tier flag pending sub_tier column migration.'),

  -- ── Saudi Arabia ──────────────────────────────────────────────────────
  ('KAUST Fellowship',
   'https://admissions.kaust.edu.sa/fees-funding',
   'html', 'Saudi Arabia', 'university', 168,
   'Every admit auto-receives; full tuition + $20-30k/yr stipend + housing + medical + relocation; STEM grad.');

-- ============================================================================
-- Verification query (run after migration applies)
-- ============================================================================
-- SELECT COUNT(*) AS new_rows
--   FROM scholarship_sources
--   WHERE category = 'university'
--     AND created_at >= '2026-05-22 18:00:00+00';
-- Expected: 13

-- ============================================================================
-- Follow-up gaps (NOT addressed in this migration)
-- ============================================================================
-- 1. sub_tier column does not yet exist. Add via separate schema migration
--    before the Pass 2 deactivation runs. Radboud RSP and Leiden LExS need
--    sub_tier = 'partial_coverage_named' once the column lands.
--
-- 2. Naming inconsistencies surfaced in the 2026-05-22 diff (existing rows
--    that match keep list semantically but use different wording):
--    - "Notre Dame Hesburgh Scholars" — keep list calls it Hesburgh-Yusko
--    - "UAE MBZUAI PhD Scholarship" — keep list intends both MS+PhD coverage
--    - "Princeton MPP / MPA Fellowship" — keep list says SPIA MPP/MPA
--    - "University of Sydney International Scholarships" — keep list intends
--      the named USYDIS specifically; existing row may be a generic page
--    Rename via UPDATE in a follow-up migration once the canonical names are
--    confirmed against each university's official 2026-27 cycle page.
--
-- 3. HKPFS (Hong Kong PhD Fellowship Scheme) lives in the government category,
--    not university. The §1.5 keep list cross-references it for completeness
--    but Pass 2 university deactivation will not touch it.
