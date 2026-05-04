-- =============================================================================
-- Scholarship sources — fifth seed batch (v5): TopUni-audience leverage
-- =============================================================================
-- v3 + v4 covered the obvious global anchors. v5 leans into where TopUni's
-- actual audience comes from (CIS, Central Asia, South Asia) plus the
-- highest-leverage adjacents we'd been thin on:
--
--   · Programs for Central Asian / CIS / Caucasus students specifically
--   · Tech-industry scholarships (Google, Meta, AWS, Microsoft, IBM)
--   · More US private universities with strong international aid
--   · Specialised EU + UK programs we missed
--   · Domain-specific scholarship hubs (DAAD funding-guide pages,
--     scholarshippanda, fastweb-class aggregators)
--
-- Same curation bar as v1-v4 (international students, substantial
-- funding, active cycle, clear deadlines, established programs).
--
-- ON CONFLICT (url) DO UPDATE so re-running is safe.
-- =============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── Central Asia / CIS / Caucasus — TopUni's home audience ────────────
  ('OSCE Academy Bishkek Scholarship',                 'https://www.osce-academy.net/en/study/financial-aid-fellowships/',                                              'html', 'Kyrgyzstan',  'university', 168, 'Central Asia regional MA program; full ride for select.'),
  ('AUCA Magister Scholarship',                        'https://auca.kg/en/financial_aid/',                                                                              'html', 'Kyrgyzstan',  'university', 168, 'American University of Central Asia.'),
  ('Nazarbayev University International Scholarship',  'https://nu.edu.kz/admissions/international-students/financial-aid',                                              'html', 'Kazakhstan',  'university', 168, 'NU undergraduate + graduate; English-medium.'),
  ('KIMEP University Scholarships',                    'https://www.kimep.kz/admissions/financial-aid/',                                                                  'html', 'Kazakhstan',  'university', 168, NULL),
  ('Bolashak International Scholarship',               'https://bolashak.gov.kz/en',                                                                                       'html', 'Kazakhstan',  'government', 168, 'For Kazakhstani citizens; abroad study.'),
  ('University of Central Asia Scholarships',          'https://www.ucentralasia.org/about/scholarships',                                                                  'html', 'Kyrgyzstan',  'university', 168, 'Aga Khan-funded; pan-Central Asia.'),
  ('Tashkent State University of Economics Scholarship','https://tsue.uz/en/admission/scholarships/',                                                                       'html', 'Uzbekistan',  'university', 336, NULL),
  ('Inha University Tashkent Scholarships',            'https://inha.uz/en/scholarship/',                                                                                  'html', 'Uzbekistan',  'university', 336, NULL),
  ('Webster University Tashkent Scholarships',         'https://webster.uz/scholarships/',                                                                                'html', 'Uzbekistan',  'university', 336, NULL),
  ('Caucasus University Tbilisi Scholarships',         'https://www.cu.edu.ge/en/scholarships',                                                                            'html', 'Georgia',     'university', 336, NULL),
  ('Tbilisi State University International Scholarship','https://www.tsu.ge/en/scholarships',                                                                              'html', 'Georgia',     'university', 336, NULL),
  ('ADA University Scholarship',                       'https://ada.edu.az/admission/scholarships',                                                                        'html', 'Azerbaijan',  'university', 336, NULL),
  ('UWED Tashkent Government Scholarship',             'https://uwed.uz/en/admission/financial-aid/',                                                                      'html', 'Uzbekistan',  'university', 336, NULL),
  ('AlmaU Almaty Scholarships',                        'https://almau.edu.kz/en/scholarships',                                                                              'html', 'Kazakhstan',  'university', 336, NULL),
  ('Open Society University Network',                  'https://opensocietyuniversitynetwork.org/programs/access-and-equity',                                              'html', 'Global',      'ngo',        168, 'Multi-country network; CEU/Bard/Al-Quds partnerships.'),

  -- ── Tech-industry sponsored scholarships ──────────────────────────────
  ('Google Lime Scholarship',                          'https://www.lime-connect.com/programs/page/google-lime-scholarship-program-for-students-with-disabilities',     'html', 'Global',      'foundation', 168, 'STEM + disability; for US/Canada study.'),
  ('Google Generation Scholarship Asia Pacific',       'https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-asia-pacific',                'html', 'Global',      'foundation', 168, 'Women in computing; APAC.'),
  ('Google Generation Scholarship EMEA',               'https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-emea',                        'html', 'Global',      'foundation', 168, 'Women in computing; EMEA.'),
  ('Meta Engineering Scholarship',                     'https://www.metacareers.com/students/diversity/scholarship',                                                       'html', 'Global',      'foundation', 168, 'Underrepresented students in CS.'),
  ('Microsoft AI Scholars Program',                    'https://www.microsoft.com/en-us/diversity/programs/scholarships',                                                  'html', 'Global',      'foundation', 168, 'STEM diversity; multi-program umbrella.'),
  ('AWS Generative AI Scholarship',                    'https://www.aboutamazon.com/news/community/aws-aiml-scholarship-program',                                          'html', 'Global',      'foundation', 168, 'Underrepresented students in AI/ML.'),
  ('IBM Global University Programs Scholarships',      'https://www.ibm.com/academic/topic/scholarships',                                                                  'html', 'Global',      'foundation', 336, NULL),
  ('Adobe Research Women-in-Technology Scholarship',   'https://research.adobe.com/scholarship/',                                                                          'html', 'Global',      'foundation', 168, 'Women in CS/STEM PhD-track.'),
  ('Apple Scholars in AI/ML',                          'https://machinelearning.apple.com/updates/apple-scholars-aiml-2024',                                                'html', 'Global',      'foundation', 168, 'PhD students in AI/ML; multi-year.'),
  ('NVIDIA Graduate Fellowship',                       'https://www.nvidia.com/en-us/research/graduate-fellowships/',                                                       'html', 'US',          'foundation', 168, 'PhD students in GPU-accelerated research.'),
  ('Salesforce CRM Equality Scholarship',              'https://www.salesforce.com/news/stories/equality-scholarship/',                                                    'html', 'Global',      'foundation', 336, NULL),
  ('Atlassian Diversity Scholarship',                  'https://www.atlassian.com/company/careers/students/diversity-scholarship',                                          'html', 'Global',      'foundation', 336, NULL),
  ('GitHub Education Student Developer Pack',          'https://education.github.com/pack',                                                                                'html', 'Global',      'foundation', 720, 'Resource pack rather than tuition; useful adjacency.'),
  ('JetBrains Free Educational License',               'https://www.jetbrains.com/community/education/',                                                                   'html', 'Global',      'foundation', 720, 'Tools rather than tuition; useful adjacency.'),

  -- ── More US private universities with substantial international aid ──
  ('Williams College International Aid',               'https://admission.williams.edu/financial-aid/',                                                                    'html', 'US',          'university', 168, 'Need-blind for international students.'),
  ('Amherst College International Aid',                'https://www.amherst.edu/admission/financial-aid/applying-for-aid/international-student-aid',                       'html', 'US',          'university', 168, 'Need-blind for international students.'),
  ('Bowdoin College International Aid',                'https://www.bowdoin.edu/admissions/financial-aid/international-students.html',                                     'html', 'US',          'university', 168, NULL),
  ('Pomona College International Aid',                 'https://www.pomona.edu/admissions/financial-aid/international-students',                                            'html', 'US',          'university', 168, 'Need-blind for international students.'),
  ('Wellesley College International Aid',              'https://www.wellesley.edu/sfs/applying/international',                                                              'html', 'US',          'university', 168, NULL),
  ('Smith College International Aid',                  'https://www.smith.edu/financial-aid/international-students',                                                        'html', 'US',          'university', 168, NULL),
  ('Mount Holyoke International Aid',                  'https://www.mtholyoke.edu/admission/affording-mount-holyoke/international-students',                                'html', 'US',          'university', 168, NULL),
  ('Dartmouth College International Aid',              'https://admissions.dartmouth.edu/affording-dartmouth/international-applicants',                                    'html', 'US',          'university', 168, 'Need-aware international.'),
  ('Brown University International Aid',               'https://admission.brown.edu/financial-aid/international-students',                                                  'html', 'US',          'university', 168, NULL),
  ('Vanderbilt Cornelius Vanderbilt Scholarship',      'https://www.vanderbilt.edu/scholarships/',                                                                          'html', 'US',          'university', 168, 'Merit; full tuition + stipend.'),
  ('Emory Scholars Program',                           'https://scholars.emory.edu/',                                                                                       'html', 'US',          'university', 168, NULL),
  ('Duke Robertson Scholars',                          'https://robertsonscholars.org/',                                                                                    'html', 'US',          'university', 168, 'Duke + UNC dual-campus full-merit.'),
  ('Notre Dame Hesburgh Scholars',                     'https://hesburghyusko.nd.edu/',                                                                                      'html', 'US',          'university', 168, NULL),
  ('USC Trustee Scholarship',                          'https://admission.usc.edu/financial-aid/types-of-aid/merit-scholarships/',                                          'html', 'US',          'university', 168, 'USC merit; full tuition.'),
  ('Boston College Presidential Scholars',             'https://www.bc.edu/bc-web/admission/financial-aid.html',                                                            'html', 'US',          'university', 168, NULL),

  -- ── More UK / EU university programs ──────────────────────────────────
  ('Oxford Weidenfeld-Hoffmann Scholarship',           'https://www.weidenfeldhoffmann.org/',                                                                               'html', 'UK',          'foundation', 168, 'Oxford master''s; transition-economy / developing world.'),
  ('Oxford Saïd MBA Scholarships',                     'https://www.sbs.ox.ac.uk/programmes/mba/financing-your-mba/scholarships',                                          'html', 'UK',          'university', 168, NULL),
  ('Cambridge Trust Pakistan Scholarships',            'https://www.cambridgetrust.org/scholarships/',                                                                       'html', 'UK',          'university', 168, NULL),
  ('Cambridge Vice-Chancellor''s Awards',              'https://www.student-funding.cam.ac.uk/fund/cambridge-vice-chancellors-awards-cambridge-trust',                     'html', 'UK',          'university', 168, NULL),
  ('Imperial College President''s PhD Scholarship',    'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/external/imperial-college-presidents-phd-scholarships/', 'html', 'UK', 'university', 168, NULL),
  ('UCL CSC Scholarship Programme',                    'https://www.ucl.ac.uk/scholarships/ucl-csc-china-scholarship-council-research-scholarship',                         'html', 'UK',          'university', 168, 'For Chinese nationals; PhD.'),
  ('SOAS University of London Scholarships',           'https://www.soas.ac.uk/study/fees-funding-scholarships',                                                             'html', 'UK',          'university', 168, NULL),
  ('Newcastle University International Scholarships',  'https://www.ncl.ac.uk/study/scholarships/',                                                                          'html', 'UK',          'university', 168, NULL),
  ('University of Bristol Think Big Scholarships',     'https://www.bristol.ac.uk/study/postgraduate/funding/think-big-scholarships/',                                       'html', 'UK',          'university', 168, NULL),
  ('Kings College London Dean''s International Scholarship','https://www.kcl.ac.uk/study-legacy/funding/deans-international-scholarship-applied',                            'html', 'UK',          'university', 168, NULL),
  ('University of Birmingham Global Masters Scholarship','https://www.birmingham.ac.uk/postgraduate/funding/global-masters-scholarship.aspx',                                'html', 'UK',          'university', 168, NULL),
  ('University of Leeds International Scholarship',    'https://scholarships.leeds.ac.uk/',                                                                                  'html', 'UK',          'university', 168, NULL),
  ('University of Sheffield International Scholarships','https://www.sheffield.ac.uk/postgraduate/scholarships',                                                              'html', 'UK',          'university', 168, NULL),

  -- ── Specialised European programs ─────────────────────────────────────
  ('Karolinska Institutet Global Scholarship',         'https://education.ki.se/global-master-s-scholarships',                                                              'html', 'Sweden',      'university', 168, 'Health/medicine global master''s.'),
  ('Stockholm School of Economics Scholarship',        'https://www.hhs.se/en/admissions--aid/financing-your-studies/scholarships/',                                       'html', 'Sweden',      'university', 168, NULL),
  ('Uppsala University IPK Scholarship',               'https://www.uu.se/en/study/scholarships',                                                                            'html', 'Sweden',      'university', 168, NULL),
  ('University of Oslo International Scholarships',    'https://www.uio.no/english/studies/admission/scholarships/',                                                         'html', 'Norway',      'university', 168, NULL),
  ('NHH Norwegian School of Economics Scholarships',   'https://www.nhh.no/en/study-programmes/financial-support/',                                                          'html', 'Norway',      'university', 168, NULL),
  ('NTNU International Master Scholarship',            'https://www.ntnu.edu/admissions/scholarships',                                                                       'html', 'Norway',      'university', 168, NULL),
  ('Aarhus University Scholarship Programme',          'https://international.au.dk/admission/scholarships',                                                                 'html', 'Denmark',     'university', 168, NULL),
  ('University of Copenhagen Tuition-Waiver Scholarships','https://studies.ku.dk/masters/scholarships/',                                                                     'html', 'Denmark',     'university', 168, NULL),
  ('Copenhagen Business School Tuition-Waiver',        'https://www.cbs.dk/en/study/programmes/financing-your-studies',                                                       'html', 'Denmark',     'university', 168, NULL),
  ('Wageningen University Excellence Scholarship',     'https://www.wur.nl/en/Education-Programmes/master/Wageningen-Scholarships.htm',                                       'html', 'Netherlands', 'university', 168, NULL),
  ('Erasmus University Holland Scholarship',           'https://www.eur.nl/en/education/practical-matters/admission-application/scholarships',                              'html', 'Netherlands', 'university', 168, NULL),
  ('Leiden University Excellence Scholarship',         'https://www.universiteitleiden.nl/en/education/practical-information/grants-and-scholarships/leiden-university-excellence-scholarship', 'html', 'Netherlands', 'university', 168, NULL),
  ('Utrecht University Excellence Scholarship',        'https://www.uu.nl/en/education/scholarships',                                                                        'html', 'Netherlands', 'university', 168, NULL),

  -- ── Asian universities we missed ─────────────────────────────────────
  ('Yonsei University Scholarships',                   'https://www.yonsei.ac.kr/en_sc/admission/grad_admin/scholarship.jsp',                                                'html', 'Korea',       'university', 168, NULL),
  ('Korea University Global Scholarships',             'https://gradadmissions.korea.ac.kr/gradadmissions_en/admissions/scholarship.do',                                     'html', 'Korea',       'university', 168, NULL),
  ('Hanyang University International Scholarship',     'https://hanyangadmission.com/scholarships/',                                                                          'html', 'Korea',       'university', 168, NULL),
  ('Sungkyunkwan SKKU International Scholarship',      'https://admission.skku.edu/admission/scholarship.do',                                                                'html', 'Korea',       'university', 168, NULL),
  ('Waseda University Scholarships',                   'https://www.waseda.jp/inst/cie/en/applicants/scholarships',                                                          'html', 'Japan',       'university', 168, NULL),
  ('Keio University Scholarships',                     'https://www.keio.ac.jp/en/study-at-keio/scholarships/',                                                              'html', 'Japan',       'university', 168, NULL),
  ('Osaka University Scholarships',                    'https://www.osaka-u.ac.jp/en/international/inbound/scholarships',                                                    'html', 'Japan',       'university', 168, NULL),
  ('Tohoku University Future Global Leaders Program', 'https://www.tohoku.ac.jp/en/admissions/scholarships.html',                                                            'html', 'Japan',       'university', 168, NULL),
  ('Fudan University Scholarships',                    'https://iso.fudan.edu.cn/Data/View/3060',                                                                            'html', 'China',       'university', 168, NULL),
  ('Shanghai Jiao Tong University Scholarships',       'https://isc.sjtu.edu.cn/EN/info/1078/2120.htm',                                                                      'html', 'China',       'university', 168, NULL),
  ('IIT Bombay Institute Free Studentship',            'https://www.iitb.ac.in/en/education/financial-assistance',                                                            'html', 'India',       'university', 168, NULL),
  ('IISc Bangalore Scholarships',                      'https://iisc.ac.in/admissions/research-programmes/scholarships/',                                                    'html', 'India',       'university', 168, NULL),

  -- ── Three more aggregator hubs ────────────────────────────────────────
  ('DAAD Funding Guide',                               'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/',                              'html', 'Global',      'aggregator', 336, 'HUB: DAAD funding database; pass to discover-from-hub.'),
  ('Scholarship Panda',                                'https://scholarshippanda.com/',                                                                                       'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.'),
  ('Top Universities Scholarships',                    'https://www.topuniversities.com/scholarships',                                                                       'html', 'Global',      'aggregator', 336, 'HUB: QS scholarships portal.')

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
