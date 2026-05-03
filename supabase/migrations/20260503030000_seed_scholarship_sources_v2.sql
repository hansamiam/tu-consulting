-- =============================================================================
-- Scholarship sources — second seed batch (v2)
-- =============================================================================
-- Builds on the original 20 with 30 more high-quality international full-funding
-- programs. Targets the database moat: more verified sources → broader DB →
-- better matching → better briefs. Each source is curated by hand against the
-- following bar:
--
--   1. Open to international students (not US-domestic only)
--   2. Substantial funding (full ride, tuition+stipend, or significant partial)
--   3. Active recruitment cycle (not abandoned legacy programs)
--   4. Clear deadline structure the LLM can extract reliably
--
-- All inserts are ON CONFLICT (url) DO UPDATE so re-running is safe.
-- =============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── More government / national programs ────────────────────────────
  ('Singapore International Graduate Award (SINGA)',           'https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa', 'html', 'Singapore', 'government', 48, 'PhD-only program; cite the 4-year stipend + tuition coverage explicitly.'),
  ('Lee Kuan Yew School of Public Policy (LKYSPP) Scholarship','https://lkyspp.nus.edu.sg/admissions/financial-aid',                                                       'html', 'Singapore', 'university', 72, NULL),
  ('Hong Kong PhD Fellowship Scheme',                          'https://cerg1.ugc.edu.hk/hkpfs/index.html',                                                                'html', 'Hong Kong', 'government', 72, 'Annual deadline December; 3-year fellowship.'),
  ('Taiwan ICDF Higher Education Scholarship',                 'https://www.icdf.org.tw/wSite/lp?ctNode=29950&CtUnit=11272&BaseDSD=100&mp=2',                              'html', 'Taiwan',    'government', 72, NULL),
  ('Russia Government Scholarship (Open Doors)',               'https://opendoors.education/',                                                                              'html', 'Russia',    'government', 168, NULL),
  ('Hungary Stipendium Hungaricum',                            'https://stipendiumhungaricum.hu/',                                                                          'html', 'Hungary',   'government', 72, NULL),
  ('Czech Government Scholarships',                            'https://www.msmt.cz/eu-and-international-affairs/government-scholarships-developing-countries',             'html', 'Czechia',   'government', 168, NULL),
  ('Romanian Government Scholarships',                         'https://www.mae.ro/en/node/10250',                                                                          'html', 'Romania',   'government', 168, NULL),
  ('Polish NAWA Banach Scholarship',                           'https://nawa.gov.pl/en/scholarships/banach-programme',                                                      'html', 'Poland',    'government', 168, NULL),
  ('Estonian Dora Plus Scholarship',                           'https://haridus.archimedes.ee/en/dora-plus',                                                                'html', 'Estonia',   'government', 168, NULL),
  ('Slovak National Scholarship Programme',                    'https://www.scholarships.sk/en/main',                                                                       'html', 'Slovakia',  'government', 168, NULL),
  ('Türkiye Burslari (Türkiye Scholarships)',                  'https://www.turkiyeburslari.gov.tr/en',                                                                     'html', 'Turkey',    'government', 72, NULL),
  ('Italian Government MAECI Scholarships',                    'https://esteri.it/en/opportunita/borse-di-studio/borsedistudioperstranieri/',                               'html', 'Italy',     'government', 168, NULL),
  ('Saudi Arabia KAUST Fellowship',                            'https://www.kaust.edu.sa/en/study/student-fellowships',                                                     'html', 'Saudi Arabia','government', 72, NULL),
  ('UAE MBZUAI PhD Scholarship',                               'https://mbzuai.ac.ae/admissions/financial-aid/',                                                            'html', 'UAE',       'university', 72, NULL),

  -- ── More university / foundation flagships ─────────────────────────
  ('Yale World Fellows',                                        'https://worldfellows.yale.edu/',                                                                            'html', 'US',        'university', 168, 'Mid-career fellowship — 16 fellows / year. Highly selective.'),
  ('Harvard Kennedy School Scholarships',                       'https://www.hks.harvard.edu/educational-programs/financial-aid',                                            'html', 'US',        'university', 72, NULL),
  ('Princeton MPP / MPA Fellowship',                            'https://spia.princeton.edu/admissions/financial-aid',                                                        'html', 'US',        'university', 168, NULL),
  ('MIT Presidential Fellowship',                               'https://gradadmissions.mit.edu/costs-funding/financial-support',                                              'html', 'US',        'university', 168, NULL),
  ('Stanford GSE Fellowship',                                   'https://ed.stanford.edu/financial-aid',                                                                      'html', 'US',        'university', 168, NULL),
  ('Cambridge Trust Scholarships',                              'https://www.cambridgetrust.org/',                                                                            'html', 'UK',        'university', 168, 'Multiple programs under one umbrella — capture each cohort.'),
  ('Oxford Reach Scholars',                                     'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search',              'html', 'UK',        'university', 72, NULL),
  ('Imperial College PhD Scholarships',                         'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/',                                  'html', 'UK',        'university', 72, NULL),
  ('LSE Scholarships for Master''s Students',                   'https://www.lse.ac.uk/study-at-lse/Graduate/fees-and-funding/Financial-Support',                            'html', 'UK',        'university', 72, NULL),
  ('University of Toronto Lester B. Pearson Scholarships',     'https://future.utoronto.ca/pearson/',                                                                        'html', 'Canada',    'university', 168, 'Undergraduate-only; full ride for one year.'),
  ('McGill Entrance Scholarships',                              'https://www.mcgill.ca/studentaid/scholarships-aid',                                                          'html', 'Canada',    'university', 168, NULL),
  ('University of Melbourne Graduate Research Scholarship',    'https://scholarships.unimelb.edu.au/awards/graduate-research-scholarships',                                  'html', 'Australia', 'university', 168, NULL),
  ('University of Sydney International Scholarships',           'https://www.sydney.edu.au/scholarships/',                                                                    'html', 'Australia', 'university', 168, NULL),

  -- ── More NGO / Foundation programs ────────────────────────────────
  ('Mastercard Foundation Scholars Program',                   'https://mastercardfdn.org/all/scholars/',                                                                     'html', 'Global',    'ngo',        72, 'Africa-focused; multiple partner universities globally — extract each.'),
  ('Joint Japan World Bank Graduate Scholarship Program',      'https://www.worldbank.org/en/programs/scholarships',                                                          'html', 'Global',    'ngo',        72, NULL)

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
