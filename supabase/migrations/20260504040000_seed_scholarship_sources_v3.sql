-- =============================================================================
-- Scholarship sources — third seed batch (v3): scale infrastructure
-- =============================================================================
-- Ship the source registry from ~50 → ~130 verified URLs the cron can crawl
-- on schedule. Designed to scale the verified scholarships table from
-- ~200 → 500-1000+ rows as the cron processes them over the coming weeks.
--
-- Curated bar (same as v1/v2):
--   1. Open to international students
--   2. Substantial funding (full ride, tuition+stipend, or significant partial)
--   3. Active recruitment cycle
--   4. Clear deadline structure for reliable LLM extraction
--   5. Well-established programs unlikely to disappear (no sunset risk)
--
-- Categories added:
--   · Government / national: more European, Middle East, Asia-Pacific
--   · University: top-50 global with structured aid pages
--   · Foundation / NGO: established philanthropic programs
--   · Aggregator HUBS: directory pages that list many programs (the
--     discover-from-hub edge function follows links from these to
--     auto-add per-program sources, multiplying scale further)
--
-- ON CONFLICT (url) DO UPDATE so re-running is safe.
-- =============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── Government / national programs (Europe expansion) ───────────────────
  ('Swiss Government Excellence Scholarships',         'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html', 'html', 'Switzerland', 'government', 168, 'Country-specific quotas; PhD/postdoc focus.'),
  ('Austrian OeAD Scholarships',                       'https://oead.at/en/to-austria/scholarships',                                                                  'html', 'Austria',     'government', 168, NULL),
  ('Belgian VLIR-UOS Scholarships',                    'https://www.vliruos.be/scholarships',                                                                          'html', 'Belgium',     'government', 168, 'Development-focused; partner countries list matters.'),
  ('Spanish MAEC-AECID Scholarships',                  'https://www.aecid.es/becas-MAEC-AECID',                                                                        'html', 'Spain',       'government', 168, NULL),
  ('Finnish EDUFI Fellowship',                         'https://www.oph.fi/en/services/edufi-fellowship-programme',                                                    'html', 'Finland',     'government', 168, 'Doctoral-level, 3-12 month grants.'),
  ('Danish Government Scholarships',                   'https://studyindenmark.dk/study-options/tuition-fees-and-scholarships/danish-government-scholarships',         'html', 'Denmark',     'government', 168, NULL),
  ('Norwegian Quota Scheme',                           'https://www.studyinnorway.no/study-in-Norway/Tuition-and-scholarships',                                        'html', 'Norway',      'government', 336, NULL),
  ('Bulgarian Government Scholarships',                'https://www.mon.bg/en/100485',                                                                                  'html', 'Bulgaria',    'government', 336, NULL),
  ('Croatian Government Scholarship',                  'https://mzo.gov.hr/highlights-15203/scholarship-programmes/scholarships-for-international-students/2120',      'html', 'Croatia',     'government', 336, NULL),
  ('Lithuanian State Scholarships',                    'https://www.stipendijos.lt/en/foreigners',                                                                      'html', 'Lithuania',   'government', 336, NULL),
  ('Latvian State Scholarships',                       'https://viaa.gov.lv/en/scholarships',                                                                           'html', 'Latvia',      'government', 336, NULL),
  ('Iceland Government Scholarship',                   'https://www.arnastofnun.is/en/icelandic-government-scholarships',                                               'html', 'Iceland',     'government', 336, 'Small program, Icelandic-language focus.'),
  ('Bavarian State Ministry Scholarships',             'https://www.uni-augsburg.de/en/international/incoming/master-s-and-doctoral-students/financing-your-studies/scholarships/', 'html', 'Germany', 'government', 168, 'Bavaria-specific; PhD level.'),

  -- ── Government programs (Asia-Pacific expansion) ────────────────────────
  ('Japan JASSO Scholarship',                          'https://www.jasso.go.jp/en/study_j/scholarships/index.html',                                                   'html', 'Japan',       'government',  72, NULL),
  ('Japan Mitsubishi UFJ Foundation Scholarship',      'https://www.muff.or.jp/english/scholarship/',                                                                   'html', 'Japan',       'foundation', 168, 'Asian students only.'),
  ('Korea POSCO Asia Fellowship',                      'https://www.postf.org/en/business/business02_3.do',                                                             'html', 'Korea',       'foundation', 168, NULL),
  ('Chinese Government Scholarship (CSC)',             'https://www.campuschina.org/scholarships/cscscholarship.html',                                                  'html', 'China',       'government',  72, 'CSC; multiple program types — capture each.'),
  ('Confucius Institute Scholarship',                  'https://cis.chinese.cn/Account/Login',                                                                          'html', 'China',       'government', 168, 'Chinese language study.'),
  ('Taiwan MOE Scholarship',                           'https://english.moe.gov.tw/cp-117-22463-2007a-1.html',                                                          'html', 'Taiwan',      'government', 168, NULL),
  ('Singapore A*STAR National Science Scholarship',    'https://www.a-star.edu.sg/Scholarships/for-undergraduate-studies',                                              'html', 'Singapore',   'government', 168, 'Singapore-bonded; STEM only.'),
  ('Hong Kong Belt and Road Scholarship',              'https://www.cspe.edu.hk/en/scholarships/Belt-and-Road-Scholarship.html',                                        'html', 'Hong Kong',   'government', 168, NULL),
  ('Indian ICCR Scholarship',                          'https://a2ascholarships.iccr.gov.in/',                                                                          'html', 'India',       'government', 168, 'For non-Indian nationals studying in India.'),
  ('Brunei Darussalam Government Scholarship',         'https://www.mfa.gov.bn/Pages/scholarship_application.aspx',                                                     'html', 'Brunei',      'government', 336, NULL),
  ('Thai Royal Thai Government Scholarship',           'https://www.ocsc.go.th/en/scholarship',                                                                          'html', 'Thailand',    'government', 336, 'For Thai nationals; included for completeness.'),
  ('Malaysian International Scholarship',              'https://biasiswa.mohe.gov.my/INTER/',                                                                            'html', 'Malaysia',    'government', 168, NULL),
  ('Indonesian LPDP Scholarship',                      'https://lpdp.kemenkeu.go.id/en/',                                                                                'html', 'Indonesia',   'government', 168, 'For Indonesian nationals abroad.'),
  ('Vietnam Government Scholarship Program',           'https://moet.gov.vn/en/Pages/home.aspx',                                                                         'html', 'Vietnam',     'government', 336, NULL),

  -- ── Government programs (Africa, Middle East, Latin America) ───────────
  ('Egypt Government Scholarship',                     'https://www.eg.undp.org/content/egypt/en/home/operations/jobs.html',                                            'html', 'Egypt',       'government', 336, NULL),
  ('Israel Council for Higher Education Scholarships', 'https://www.gov.il/en/departments/topics/scholarship_for_studying',                                              'html', 'Israel',      'government', 336, NULL),
  ('Brazil CAPES Scholarship',                         'https://www.gov.br/capes/pt-br',                                                                                'html', 'Brazil',      'government', 336, 'Portuguese-language site; LLM should handle.'),
  ('Argentina Becar Scholarship',                      'https://www.argentina.gob.ar/educacion/becas',                                                                  'html', 'Argentina',   'government', 336, NULL),
  ('Chile CONICYT/ANID Becas',                         'https://anid.cl/concursos/becas/',                                                                              'html', 'Chile',       'government', 336, NULL),

  -- ── University flagships (US top-50 expansion) ──────────────────────────
  ('Columbia University Financial Aid',                'https://gsas.columbia.edu/student-resources/financial-support',                                                 'html', 'US',          'university', 168, NULL),
  ('Wharton (UPenn) Fellowships',                      'https://mba.wharton.upenn.edu/cost-aid/scholarships-fellowships/',                                              'html', 'US',          'university', 168, NULL),
  ('UC Berkeley Graduate Fellowships',                 'https://grad.berkeley.edu/financial/fellowships/',                                                              'html', 'US',          'university', 168, NULL),
  ('Carnegie Mellon Fellowships',                      'https://www.cmu.edu/graduate/financial-support/index.html',                                                     'html', 'US',          'university', 168, NULL),
  ('University of Michigan International Awards',      'https://internationalcenter.umich.edu/payment/funding-options',                                                 'html', 'US',          'university', 168, NULL),
  ('University of Chicago Booth Fellowships',          'https://www.chicagobooth.edu/admissions/full-time-mba/financing/scholarships',                                  'html', 'US',          'university', 168, NULL),
  ('Cornell University Fellowships',                   'https://gradschool.cornell.edu/financial-support/',                                                             'html', 'US',          'university', 168, NULL),
  ('University of Washington Graduate Fellowships',    'https://grad.uw.edu/financial-support/',                                                                        'html', 'US',          'university', 168, NULL),
  ('Johns Hopkins Bloomberg Fellowships',              'https://publichealth.jhu.edu/admissions/financial-aid',                                                         'html', 'US',          'university', 168, NULL),
  ('Northwestern University Graduate Funding',         'https://www.tgs.northwestern.edu/funding/',                                                                     'html', 'US',          'university', 168, NULL),
  ('Duke University Graduate Aid',                     'https://gradschool.duke.edu/financial-support',                                                                  'html', 'US',          'university', 168, NULL),
  ('NYU Stern School of Business Aid',                 'https://www.stern.nyu.edu/programs-admissions/full-time-mba/admissions/scholarships',                          'html', 'US',          'university', 168, NULL),
  ('UCLA Fellowships and Financial Aid',               'https://grad.ucla.edu/funding/',                                                                                'html', 'US',          'university', 168, NULL),
  ('Georgetown SFS Scholarships',                      'https://sfs.georgetown.edu/financial-aid/',                                                                      'html', 'US',          'university', 168, NULL),

  -- ── University flagships (UK / EU expansion) ────────────────────────────
  ('Oxford Clarendon Fund',                            'https://www.ox.ac.uk/clarendon',                                                                                'html', 'UK',          'university', 168, 'Postgraduate funding for any subject; merit-only.'),
  ('Oxford Felix Scholarships',                        'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/felix',           'html', 'UK',          'university', 168, 'For students from India, Bangladesh, etc.'),
  ('Edinburgh Global Research Scholarships',           'https://www.ed.ac.uk/student-funding/postgraduate/international/global',                                        'html', 'UK',          'university', 168, NULL),
  ('UCL Global Scholarships',                          'https://www.ucl.ac.uk/scholarships/',                                                                            'html', 'UK',          'university', 168, NULL),
  ('Manchester Master''s Scholarships',                'https://www.manchester.ac.uk/study/masters/funding/',                                                            'html', 'UK',          'university', 168, NULL),
  ('Warwick Chancellor''s International Scholarship',  'https://warwick.ac.uk/study/postgraduate/scholarships',                                                          'html', 'UK',          'university', 168, NULL),
  ('Glasgow Postgraduate Scholarships',                'https://www.gla.ac.uk/scholarships/',                                                                            'html', 'UK',          'university', 168, NULL),
  ('GREAT Scholarships UK',                            'https://study-uk.britishcouncil.org/scholarships/great-scholarships',                                            'html', 'UK',          'government', 168, 'British Council; ~70 partner universities.'),
  ('ETH Zurich Excellence Scholarship & Opportunity Award', 'https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html',                              'html', 'Switzerland', 'university', 168, NULL),
  ('EPFL Excellence Fellowships',                      'https://www.epfl.ch/education/master/access-and-admission-criteria/financial-aid/',                              'html', 'Switzerland', 'university', 168, NULL),
  ('University of Geneva Excellence Scholarship',      'https://www.unige.ch/dife/en/scholarships/',                                                                    'html', 'Switzerland', 'university', 168, NULL),
  ('IE University International Scholarships',         'https://www.ie.edu/financial-aid/types-of-aid/',                                                                 'html', 'Spain',       'university', 168, NULL),
  ('IESE MBA Scholarships',                            'https://www.iese.edu/mba/admissions/financial-aid/',                                                              'html', 'Spain',       'university', 168, NULL),
  ('HEC Paris Scholarships',                           'https://www.hec.edu/en/master-s-programs/financing-and-scholarships',                                             'html', 'France',      'university', 168, NULL),
  ('INSEAD Scholarships',                              'https://www.insead.edu/master-programmes/mba/financing/scholarships',                                            'html', 'France',      'university', 168, NULL),
  ('Bocconi University Scholarships',                  'https://www.unibocconi.eu/wps/wcm/connect/Bocconi/SitoPubblico_EN/Navigation+Tree/Home/Programs/Scholarships+and+fees/', 'html', 'Italy', 'university', 168, NULL),
  ('Politecnico di Milano International Scholarship',  'https://www.polimi.it/en/prospective-students/funding/scholarships/',                                            'html', 'Italy',       'university', 168, NULL),
  ('TU Delft Scholarships',                            'https://www.tudelft.nl/onderwijs/master/inschrijven/financien/beurzen-financiele-steun',                         'html', 'Netherlands', 'university', 168, NULL),
  ('University of Amsterdam Amsterdam Excellence Scholarship', 'https://www.uva.nl/en/education/fees-and-funding/master-s-scholarships-and-loans/amsterdam-excellence-scholarship/amsterdam-excellence-scholarship.html', 'html', 'Netherlands', 'university', 168, NULL),
  ('Lund University Global Scholarships',              'https://www.lunduniversity.lu.se/admissions/scholarships/lund-university-global-scholarship',                  'html', 'Sweden',      'university', 168, NULL),
  ('KTH Royal Institute Scholarship',                  'https://www.kth.se/en/studies/master/study-finance/scholarships',                                                'html', 'Sweden',      'university', 168, NULL),

  -- ── University flagships (Asia-Pacific top tier) ────────────────────────
  ('NUS Research Scholarship',                         'https://www.nus.edu.sg/admissions/awards-financial-aid',                                                         'html', 'Singapore',   'university', 168, NULL),
  ('NTU Research Scholarship',                         'https://www.ntu.edu.sg/admissions/financial-matters/scholarships-financial-aid',                                  'html', 'Singapore',   'university', 168, NULL),
  ('HKUST Postgraduate Studentship',                   'https://pg.hkust.edu.hk/scholarships',                                                                           'html', 'Hong Kong',   'university', 168, NULL),
  ('CUHK Vice-Chancellor''s PhD Scholarship',          'https://gradsch.cuhk.edu.hk/index.php/programmes-admissions/scholarship-information',                            'html', 'Hong Kong',   'university', 168, NULL),
  ('University of Hong Kong Postgraduate Scholarships','https://www.gradsch.hku.hk/gradsch/prospective-students/scholarships',                                            'html', 'Hong Kong',   'university', 168, NULL),
  ('KAIST International Student Scholarship',          'https://admission.kaist.ac.kr/intl-undergraduate/scholarship/',                                                  'html', 'Korea',       'university', 168, NULL),
  ('Seoul National University Global Scholarship',     'https://en.snu.ac.kr/admissions/graduate/scholarships',                                                          'html', 'Korea',       'university', 168, NULL),
  ('Tsinghua University Scholarship',                  'https://www.tsinghua.edu.cn/en/Admissions/International_students/Scholarships.htm',                              'html', 'China',       'university', 168, NULL),
  ('Peking University Scholarship',                    'https://english.pku.edu.cn/admissions/scholarships.html',                                                        'html', 'China',       'university', 168, NULL),
  ('University of Tokyo Scholarships',                 'https://www.u-tokyo.ac.jp/en/prospective-students/scholarships.html',                                            'html', 'Japan',       'university', 168, NULL),
  ('Kyoto University Scholarships',                    'https://www.kyoto-u.ac.jp/en/admissions/admissions-and-scholarships/scholarships.html',                          'html', 'Japan',       'university', 168, NULL),
  ('Australian National University Scholarships',      'https://www.anu.edu.au/study/scholarships',                                                                       'html', 'Australia',   'university', 168, NULL),
  ('UNSW Sydney Scholarships',                         'https://www.scholarships.unsw.edu.au/',                                                                          'html', 'Australia',   'university', 168, NULL),
  ('University of Queensland Scholarships',            'https://scholarships.uq.edu.au/',                                                                                'html', 'Australia',   'university', 168, NULL),
  ('Monash University International Awards',           'https://www.monash.edu/study/fees-scholarships/scholarships',                                                    'html', 'Australia',   'university', 168, NULL),
  ('University of Auckland Scholarships',              'https://www.auckland.ac.nz/en/study/scholarships-awards.html',                                                  'html', 'New Zealand', 'university', 168, NULL),
  ('University of British Columbia International Awards', 'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/',                          'html', 'Canada',      'university', 168, NULL),
  ('Waterloo International Master''s Award',           'https://uwaterloo.ca/graduate-studies-postdoctoral-affairs/awards-funding',                                       'html', 'Canada',      'university', 168, NULL),

  -- ── NGO / Foundation programs ──────────────────────────────────────────
  ('Soros Foundation Scholarships (Open Society)',     'https://www.opensocietyfoundations.org/grants/scholarships',                                                    'html', 'Global',      'ngo',        168, 'Multiple programs — extract umbrella + flag deeper crawl.'),
  ('Margaret McNamara Education Grants',               'https://www.mmeg.org/apply/eligibility',                                                                        'html', 'Global',      'ngo',        168, 'Women only; from developing countries.'),
  ('Wells Mountain Initiative Empowerment Scholarship','https://www.wellsmountaininitiative.org/empowerment-scholarship-program',                                       'html', 'Global',      'ngo',        336, NULL),
  ('Vodafone Group Foundation Scholarships',           'https://www.vodafone.com/about-vodafone/what-we-do/the-vodafone-foundation',                                    'html', 'Global',      'ngo',        336, NULL),
  ('Goldman Sachs 10,000 Women',                       'https://www.goldmansachs.com/citizenship/10000women/index.html',                                                'html', 'Global',      'ngo',        336, 'Women entrepreneurs; non-degree but funded.'),
  ('Heinrich Böll Foundation Scholarships',            'https://www.boell.de/en/scholarships',                                                                          'html', 'Germany',     'foundation', 168, NULL),
  ('Konrad-Adenauer-Stiftung Scholarships',            'https://www.kas.de/en/web/begabtenfoerderung-und-kultur/scholarship-applications',                              'html', 'Germany',     'foundation', 168, NULL),
  ('Friedrich Ebert Stiftung Scholarships',            'https://www.fes.de/en/studienfoerderung/international-students',                                                'html', 'Germany',     'foundation', 168, NULL),
  ('Rosa Luxemburg Stiftung Scholarships',             'https://www.rosalux.de/en/foundation/scholarships',                                                              'html', 'Germany',     'foundation', 168, NULL),
  ('Ford Foundation International Fellowships',        'https://www.fordfoundation.org/work/our-grants/',                                                                'html', 'Global',      'ngo',        336, NULL),
  ('Pierre Elliott Trudeau Foundation Doctoral Scholarship', 'https://www.fondationtrudeau.ca/en/programs/doctoral-scholarships',                                       'html', 'Canada',      'foundation', 168, NULL),
  ('UWC Davis Scholars Program',                       'https://www.davisuwcscholars.org/',                                                                              'html', 'US',          'foundation', 168, 'For UWC alumni only; partner US universities.'),

  -- ── Aggregator / hub directories — discover-from-hub crawls these to
  --    extract individual scholarship URLs and auto-add them as new sources.
  --    Frequency lower (336 = 2 weeks) since hubs change infrequently.
  ('Scholars4Dev',                                     'https://www.scholars4dev.com/category/level-of-study/scholarships-mastersdegree/',                              'html', 'Global',      'aggregator', 336, 'HUB: directory page — pass to discover-from-hub to harvest individual scholarship URLs.'),
  ('Opportunity Desk',                                 'https://opportunitydesk.org/category/scholarships/',                                                            'html', 'Global',      'aggregator', 336, 'HUB: directory page — pass to discover-from-hub.'),
  ('Opportunities for Africans',                       'https://www.opportunitiesforafricans.com/category/scholarships/',                                                'html', 'Global',      'aggregator', 336, 'HUB: African student-focused — pass to discover-from-hub.'),
  ('After School Africa',                              'https://www.afterschoolafrica.com/category/scholarships-for-africans/',                                          'html', 'Global',      'aggregator', 336, 'HUB: African student-focused — pass to discover-from-hub.'),
  ('Opportunities Corner',                             'https://opportunitiescorner.info/scholarships/',                                                                  'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.'),
  ('ProFellow',                                        'https://www.profellow.com/fellowships/',                                                                          'html', 'Global',      'aggregator', 336, 'HUB: graduate fellowships — pass to discover-from-hub.'),
  ('Scholarships Ads',                                 'https://www.scholarshipsads.com/',                                                                                'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.'),
  ('Mladiinfo Scholarships',                           'https://www.mladiinfo.eu/category/scholarships/',                                                                'html', 'Global',      'aggregator', 336, 'HUB: Eastern European focus — pass to discover-from-hub.')

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
