-- =============================================================================
-- Scholarship sources — sixth seed batch (v6): niche depth + LATAM + Africa
-- =============================================================================
-- v3-v5 covered breadth. v6 deepens niches we shipped lightly:
--
--   · Women-in-STEM regional programs (specific countries, not just global)
--   · Climate / sustainability / energy programs beyond the headlines
--   · Refugee / displaced education funding outside DAFI
--   · More LATAM specifics (Mexico CONACYT sub-programs, Colombia, Peru,
--     Chile, Argentina university-level)
--   · More African flagship programs by country (Nigeria, Ghana,
--     Egypt, Morocco, South Africa university-level)
--   · Disability-specific scholarships at universities
--   · LGBTQ+ regional programs
--   · Three more aggregator hubs in different niches
--
-- Curated bar same as v1-v5: international students, substantial funding,
-- active cycle, clear deadlines, established programs.
--
-- ON CONFLICT (url) DO UPDATE so re-running is safe.
-- =============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── Women in STEM — regional / institutional depth ───────────────────
  ('Schlumberger Faculty for the Future Africa',       'https://www.facultyforthefuture.net/africa',                                                                       'html', 'Global',      'foundation', 168, 'Women PhD/postdoc from Africa.'),
  ('Schlumberger Faculty for the Future Asia',         'https://www.facultyforthefuture.net/asia',                                                                         'html', 'Global',      'foundation', 168, 'Women PhD/postdoc from Asia.'),
  ('Heidelberg Laureate Forum',                        'https://www.heidelberg-laureate-forum.org/',                                                                       'html', 'Germany',     'foundation', 168, 'Young researchers in math + CS.'),
  ('Lindau Nobel Laureate Meetings',                   'https://www.lindau-nobel.org/',                                                                                     'html', 'Germany',     'foundation', 168, NULL),
  ('Grace Hopper Celebration Scholarships',            'https://anitab.org/scholarships/',                                                                                  'html', 'Global',      'foundation', 168, 'Women in computing.'),
  ('Generation Google Scholarship India',              'https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-india',                          'html', 'India',       'foundation', 168, 'Women in CS in India.'),
  ('Society of Women Engineers Asia',                  'https://swe.org/scholarships/',                                                                                     'html', 'Asia',        'ngo',        336, 'Pull APAC sub-programs.'),
  ('African Women in STEM Scholarship Network',        'https://awism.org/scholarships',                                                                                    'html', 'Global',      'ngo',        336, NULL),

  -- ── Climate / sustainability — deeper coverage ───────────────────────
  ('MasterCard Foundation Climate Innovation',         'https://mastercardfdn.org/climate/',                                                                                'html', 'Global',      'ngo',        168, NULL),
  ('Bertha Foundation Climate Activist Fellowship',    'https://berthafoundation.org/our-fellowships/climate/',                                                             'html', 'Global',      'foundation', 168, NULL),
  ('Fulbright Climate Specialist Program',             'https://fulbrightspecialist.worldlearning.org/specialist-projects/',                                                 'html', 'US',          'government', 168, NULL),
  ('Doris Duke Foundation Climate Fellowship',         'https://www.dorisduke.org/our-grantmaking/environment/',                                                            'html', 'US',          'foundation', 336, NULL),
  ('Climate Tracker Mentorship',                       'https://climatetracker.org/mentorship/',                                                                            'html', 'Global',      'ngo',        336, 'Journalism + policy on climate.'),
  ('Energy Foundation China Scholarship',              'https://www.efchina.org/Scholarships',                                                                              'html', 'China',       'foundation', 336, NULL),
  ('Solar Decathlon Student Funding',                  'https://www.solardecathlon.gov/',                                                                                    'html', 'US',          'government', 336, NULL),
  ('Royal Society Newton International Fellowships',   'https://royalsociety.org/grants-schemes-awards/grants/newton-international/',                                       'html', 'UK',          'foundation', 168, 'Postdocs across all sciences.'),

  -- ── Refugee / displaced education — beyond DAFI ──────────────────────
  ('Educate a Child International',                    'https://educateachild.org/our-partners-projects',                                                                   'html', 'Global',      'ngo',        336, NULL),
  ('Norwegian Students'' and Academics'' Aid Fund',    'https://saih.no/english/',                                                                                          'html', 'Norway',      'ngo',        336, 'Refugee + displaced students globally.'),
  ('Jusoor Syrian Scholarship',                        'https://jusoorsyria.com/programs/scholarship-program/',                                                              'html', 'Global',      'ngo',        168, 'Syrian students.'),
  ('IIE Syria Consortium for Higher Education',        'https://www.iie.org/Programs/Syria-Consortium',                                                                     'html', 'Global',      'ngo',        336, NULL),
  ('SPARK Higher Education Programs',                  'https://spark-online.org/our-work/higher-education/',                                                                'html', 'Global',      'ngo',        168, 'Refugees + young people in fragile contexts.'),
  ('UNESCO Qualifications Passport Programme',         'https://www.unesco.org/en/qualifications-passport',                                                                  'html', 'Global',      'ngo',        720, 'Adjacent — qualifications recognition for refugees.'),

  -- ── LATAM specifics ──────────────────────────────────────────────────
  ('Mexico CONACYT Doctoral Abroad',                   'https://conahcyt.mx/becas-y-posgrados/becas-en-el-extranjero/',                                                      'html', 'Mexico',      'government', 168, NULL),
  ('Mexico FUNED MBA Loans',                           'https://www.funed.mx/becas-y-creditos',                                                                              'html', 'Mexico',      'foundation', 336, NULL),
  ('Tec de Monterrey Líderes del Mañana',              'https://tec.mx/es/becas-y-financiamiento/becas-y-apoyos-financieros',                                                'html', 'Mexico',      'university', 168, NULL),
  ('UNAM International Master Scholarships',           'https://escolar.unam.mx/becas/',                                                                                     'html', 'Mexico',      'university', 336, NULL),
  ('Universidad de los Andes Scholarships',            'https://uniandes.edu.co/financia-tu-pregrado',                                                                       'html', 'Colombia',    'university', 168, NULL),
  ('Pontificia Universidad Javeriana Scholarships',    'https://www.javeriana.edu.co/inicio',                                                                                'html', 'Colombia',    'university', 336, NULL),
  ('Pontificia Universidad Católica del Perú Beca',    'https://www.pucp.edu.pe/admision/becas-y-financiamiento/',                                                           'html', 'Peru',        'university', 336, NULL),
  ('Universidad de Chile International Scholarships',  'https://www.uchile.cl/portal/programa-de-movilidad-estudiantil/65612/becas-internacionales',                        'html', 'Chile',       'university', 336, NULL),
  ('Universidad de Buenos Aires Becas',                'https://www.uba.ar/internacionales/contenido.php?id=4',                                                              'html', 'Argentina',   'university', 336, NULL),
  ('FAPESP São Paulo Research Foundation',             'https://fapesp.br/en/scholarships',                                                                                  'html', 'Brazil',      'foundation', 168, 'PhD/postdoc in São Paulo state.'),
  ('CAPES PrInt International Mobility',               'https://www.gov.br/capes/pt-br/acessoainformacao/acoes-e-programas/bolsas/bolsas-no-exterior/programa-print',      'html', 'Brazil',      'government', 168, NULL),

  -- ── Africa — country-level depth ─────────────────────────────────────
  ('University of Lagos Scholarships',                 'https://unilag.edu.ng/admission-financial-aid/',                                                                     'html', 'Nigeria',     'university', 336, NULL),
  ('University of Ibadan Scholarships',                'https://ui.edu.ng/scholarship-news',                                                                                  'html', 'Nigeria',     'university', 336, NULL),
  ('PTDF Overseas Scholarship Scheme',                 'https://www.ptdf.gov.ng/our-services/scholarship/',                                                                  'html', 'Nigeria',     'government', 168, 'Petroleum-sector related; Nigerian nationals abroad.'),
  ('University of Ghana Vice-Chancellor''s Awards',    'https://www.ug.edu.gh/admissions/scholarships',                                                                      'html', 'Ghana',       'university', 336, NULL),
  ('KNUST Kumasi Scholarships',                        'https://knust.edu.gh/admissions/financial-aid',                                                                       'html', 'Ghana',       'university', 336, NULL),
  ('Mohammed VI Polytechnic University',               'https://www.um6p.ma/en/admissions',                                                                                  'html', 'Morocco',     'university', 168, 'Morocco STEM flagship.'),
  ('Cairo University International Scholarships',      'https://cu.edu.eg/Admission-and-Registration',                                                                       'html', 'Egypt',       'university', 336, NULL),
  ('American University in Cairo Scholarships',        'https://www.aucegypt.edu/admissions/financial-aid',                                                                  'html', 'Egypt',       'university', 168, NULL),
  ('University of Cape Town International Scholarships','http://www.scholarships.uct.ac.za/scholarships/postgraduate/international',                                          'html', 'South Africa','university', 168, NULL),
  ('Stellenbosch University International Scholarships','https://www.sun.ac.za/english/SUInternational/Pages/Funding.aspx',                                                  'html', 'South Africa','university', 168, NULL),
  ('Wits University Postgraduate Scholarships',        'https://www.wits.ac.za/postgraduate/postgraduate-funding/',                                                          'html', 'South Africa','university', 168, NULL),
  ('Strathmore University Scholarships',               'https://strathmore.edu/financial-aid/',                                                                              'html', 'Kenya',       'university', 336, NULL),
  ('African Leadership University',                    'https://www.alueducation.com/financial-aid/',                                                                        'html', 'Rwanda',      'university', 168, 'Pan-African undergraduate.'),

  -- ── Disability + LGBTQ+ — university-level ───────────────────────────
  ('Stanford Disability Initiative Scholarships',      'https://disability.stanford.edu/',                                                                                   'html', 'US',          'university', 336, NULL),
  ('AHEAD Disability in Higher Education Network',     'https://www.ahead.org/professional-resources/financial-aid',                                                         'html', 'US',          'ngo',        336, NULL),
  ('Disability Rights Education Fund',                 'https://dredf.org/',                                                                                                  'html', 'US',          'ngo',        336, NULL),
  ('GLAAD Rising Stars Grants',                        'https://www.glaad.org/grants',                                                                                        'html', 'US',          'ngo',        336, 'LGBTQ+ media + advocacy students.'),
  ('PFLAG National Scholarship Program',               'https://pflag.org/scholarships',                                                                                      'html', 'US',          'ngo',        336, NULL),
  ('OUTbound LGBTQ Study Abroad Scholarship',          'https://outboundscholarship.com/',                                                                                    'html', 'US',          'ngo',        336, NULL),

  -- ── Middle East regional ─────────────────────────────────────────────
  ('Qatar Foundation Scholarships',                    'https://www.qf.org.qa/education/scholarships',                                                                       'html', 'Qatar',       'foundation', 168, NULL),
  ('Hamad Bin Khalifa University Scholarship',         'https://www.hbku.edu.qa/en/financial-support',                                                                       'html', 'Qatar',       'university', 168, NULL),
  ('American University of Beirut Scholarships',       'https://www.aub.edu.lb/admissions/financialaid',                                                                     'html', 'Lebanon',     'university', 168, NULL),
  ('American University of Sharjah Scholarships',      'https://www.aus.edu/admissions/scholarships',                                                                        'html', 'UAE',         'university', 168, NULL),
  ('NYU Abu Dhabi Scholarships',                       'https://nyuad.nyu.edu/en/admissions/undergraduate-admissions/scholarships.html',                                     'html', 'UAE',         'university', 168, 'Need-blind for international.'),

  -- ── Three more aggregator hubs ───────────────────────────────────────
  ('Mladiinfo Eastern Europe',                         'https://www.mladiinfo.eu/',                                                                                          'html', 'Global',      'aggregator', 336, 'HUB: Eastern European focus — pass to discover-from-hub.'),
  ('FastWeb International Scholarship Search',         'https://www.fastweb.com/college-scholarships/articles/international-students',                                       'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.'),
  ('IIE Funding Database',                             'https://www.iie.org/programs/iie-funding-database/',                                                                  'html', 'Global',      'aggregator', 336, 'HUB: IIE-curated; pass to discover-from-hub.')

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
