-- =============================================================================
-- Scholarship sources — fourth seed batch (v4): coverage breadth
-- =============================================================================
-- v3 covered the obvious anchors (top universities, major government programs,
-- aggregator hubs). v4 fills gaps that matter for representation:
--
--   · Africa proper — beyond Mastercard Foundation
--   · Latin America — Mexico, Colombia, Peru, regional bodies
--   · Underrepresented audiences — women in STEM, refugees, disability, LGBTQ+
--   · US flagship STEM/Humanities — NSF GRFP, Hertz, DOE CSGF, Beinecke, Marshall
--   · Climate / sustainability dedicated programs
--   · Arts and humanities (often neglected by funding-oriented hubs)
--   · Three more aggregator hubs
--
-- Same curation bar as v1-v3: international students, substantial funding,
-- active cycle, clear deadlines, established programs.
--
-- ON CONFLICT (url) DO UPDATE so re-running is safe.
-- =============================================================================

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── Africa ──────────────────────────────────────────────────────────────
  ('South Africa NRF Scholarships',                    'https://www.nrf.ac.za/funding/',                                                                                'html', 'South Africa','government', 168, 'Multiple sub-programs by level — capture each.'),
  ('Mandela Rhodes Scholarship',                       'https://www.mandelarhodes.org/scholarship/',                                                                    'html', 'South Africa','foundation', 168, 'Africa-only; postgraduate study at SA universities.'),
  ('African Union Mwalimu Nyerere Scholarship',        'https://au.int/en/scholarships',                                                                                'html', 'Global',      'government', 168, 'Pan-African; for African students at AU partner unis.'),
  ('Pan African University Scholarships',              'https://pau-au.africa/scholarship/',                                                                            'html', 'Global',      'government', 168, NULL),
  ('Zawadi Africa Education Fund',                     'https://www.zawadifund.com/',                                                                                    'html', 'Global',      'foundation', 336, 'Women only; African nationals at partner US/SA unis.'),
  ('Equity Group Foundation Wings to Fly',             'https://equitygroupfoundation.com/wings-to-fly/',                                                               'html', 'Kenya',       'foundation', 336, 'Kenyan secondary students.'),
  ('African Leadership Academy Scholarships',          'https://www.africanleadershipacademy.org/admissions/scholarships/',                                              'html', 'South Africa','foundation', 168, 'Pan-African secondary; full ride.'),
  ('UNESCO Fellowships Programme',                     'https://www.unesco.org/en/fellowships',                                                                          'html', 'Global',      'ngo',        168, 'Several sub-programs — extract each.'),
  ('Ethiopian Government Scholarships',                'https://www.moe.gov.et/scholarship',                                                                              'html', 'Ethiopia',    'government', 336, NULL),
  ('Rwandan Presidential Scholar Program',             'https://www.reb.rw/index.php?id=140',                                                                            'html', 'Rwanda',      'government', 336, NULL),

  -- ── Latin America expansion ─────────────────────────────────────────────
  ('Mexico CONACYT (CONAHCYT) Scholarships',           'https://conahcyt.mx/becas-y-posgrados/',                                                                          'html', 'Mexico',      'government', 168, 'Spanish site; LLM should handle.'),
  ('Colombia ICETEX Scholarships',                     'https://portal.icetex.gov.co/Portal/Home/HomeEstudiante/becas/becas-internacionales',                            'html', 'Colombia',    'government', 168, NULL),
  ('Peru Pronabec Beca 18',                            'https://www.pronabec.gob.pe/becas/',                                                                              'html', 'Peru',        'government', 168, NULL),
  ('OAS (Organization of American States) Scholarships','https://www.oas.org/en/scholarships/',                                                                            'html', 'Global',      'ngo',        168, 'Pan-American; multiple program tiers — extract each.'),
  ('Cuba Government Scholarships (Bilateral)',         'https://www.mes.gob.cu/es/Convocatorias-becas',                                                                  'html', 'Cuba',        'government', 336, NULL),
  ('Uruguay BECA Carlos Quijano',                      'https://www.becas.uy/',                                                                                          'html', 'Uruguay',     'government', 336, NULL),
  ('Ecuador SENESCYT Scholarship',                     'https://www.educacionsuperior.gob.ec/becas-2/',                                                                  'html', 'Ecuador',     'government', 336, NULL),

  -- ── US flagship STEM and humanities ─────────────────────────────────────
  ('NSF Graduate Research Fellowship Program (GRFP)',  'https://www.nsfgrfp.org/',                                                                                       'html', 'US',          'government', 168, 'US-based researchers; STEM only; 3 yrs $37k stipend.'),
  ('Hertz Foundation Fellowship',                      'https://www.hertzfoundation.org/the-fellowship/',                                                                'html', 'US',          'foundation', 168, 'US PhD applied STEM; one of the most selective in US.'),
  ('DOE Computational Science Graduate Fellowship',    'https://www.krellinst.org/csgf/',                                                                                 'html', 'US',          'government', 168, 'US PhD computational science; full ride + $40k.'),
  ('Paul & Daisy Soros Fellowships for New Americans', 'https://www.pdsoros.org/',                                                                                       'html', 'US',          'foundation', 168, 'Immigrants/children of immigrants in US graduate programs.'),
  ('Beinecke Scholarship',                             'https://beineckescholarship.org/',                                                                                'html', 'US',          'foundation', 168, 'US college juniors entering arts/humanities/social sciences PhD.'),
  ('Marshall Scholarship',                             'https://www.marshallscholarship.org/',                                                                            'html', 'UK',          'government', 72, 'US grads to UK; up to 50/year; 1-2 yrs.'),
  ('Truman Scholarship',                               'https://www.truman.gov/',                                                                                         'html', 'US',          'government', 168, 'US college juniors in public service careers.'),
  ('Goldwater Scholarship',                            'https://goldwaterscholarship.gov/',                                                                               'html', 'US',          'government', 168, 'US sophomores/juniors in STEM research.'),
  ('Udall Scholarship',                                'https://www.udall.gov/OurPrograms/Scholarship/Scholarship.aspx',                                                  'html', 'US',          'government', 168, 'US juniors/sophomores in environment / Native American policy.'),
  ('Boren Awards (NSEP)',                              'https://www.borenawards.org/',                                                                                    'html', 'US',          'government', 168, 'US students; language study abroad in critical regions.'),
  ('Critical Language Scholarship (CLS)',              'https://www.clscholarship.org/',                                                                                  'html', 'US',          'government', 168, 'Summer immersion in 14 critical languages.'),
  ('Gilman Scholarship',                               'https://www.gilmanscholarship.org/',                                                                              'html', 'US',          'government', 168, 'Pell-grant US students for study abroad.'),
  ('NIH Oxford-Cambridge Scholars Program',            'https://oxcam.gpp.nih.gov/',                                                                                      'html', 'US',          'government', 168, 'US/UK biomedical PhD; joint NIH-Oxbridge.'),

  -- ── Women / underrepresented in STEM ────────────────────────────────────
  ('AAUW International Fellowships',                   'https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/',                'html', 'US',          'foundation', 168, 'Women only; non-US citizens for US graduate study.'),
  ('AAUW American Fellowships',                        'https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/american/',                    'html', 'US',          'foundation', 168, 'US women; doctoral and postdoctoral.'),
  ('Anita Borg Memorial Scholarship (Google)',         'https://www.womentechmakers.com/scholars',                                                                       'html', 'Global',      'foundation', 168, 'Women in computing; multiple regional cohorts.'),
  ('Society of Women Engineers Scholarships',          'https://swe.org/scholarships/',                                                                                   'html', 'Global',      'ngo',        168, 'Women in engineering; multiple sub-awards.'),
  ('P.E.O. International Peace Scholarship',           'https://www.peointernational.org/about-peo-international-peace-scholarship-ips',                                  'html', 'US',          'foundation', 168, 'International women for graduate study in US/Canada.'),
  ('OWSD Postgraduate Fellowships',                    'https://owsd.net/career-development/early-career-fellowship',                                                     'html', 'Global',      'ngo',        168, 'Women scientists from developing countries.'),
  ('Schlumberger Faculty for the Future',              'https://www.facultyforthefuture.net/',                                                                            'html', 'Global',      'foundation', 168, 'Women from developing countries; STEM PhD/postdoc.'),
  ('L''Oreal-UNESCO For Women in Science',             'https://www.forwomeninscience.com/',                                                                              'html', 'Global',      'foundation', 168, 'Women researchers; regional and international tiers.'),

  -- ── Refugees and displaced students ─────────────────────────────────────
  ('UNHCR DAFI Scholarship',                           'https://www.unhcr.org/dafi-scholarships.html',                                                                    'html', 'Global',      'ngo',        168, 'Refugees worldwide; undergraduate study.'),
  ('Albert Einstein Refugee Initiative (DAFI variants)','https://www.unhcr.org/what-we-do/build-better-futures/education/tertiary-education/dafi-scholarship-programme', 'html', 'Global',      'ngo',        168, NULL),
  ('Said Foundation Scholarships',                     'https://www.saidfoundation.org/scholarships/',                                                                    'html', 'Global',      'foundation', 168, 'Middle Eastern/refugee scholars; UK postgraduate.'),
  ('Yale Refugee Scholarship Initiative',              'https://onhsa.yale.edu/refugee-and-asylum-seeking-students',                                                       'html', 'US',          'university', 168, NULL),
  ('Open Society University Network Hubs Refugee',     'https://opensocietyuniversitynetwork.org/programs/threatened-scholars-integration-initiative',                    'html', 'Global',      'ngo',        168, 'Threatened/displaced scholars.'),
  ('IIE Scholar Rescue Fund',                          'https://www.scholarrescuefund.org/applicants/',                                                                   'html', 'Global',      'ngo',        168, 'Threatened scholars worldwide.'),

  -- ── LGBTQ+ and identity-based programs ──────────────────────────────────
  ('Point Foundation LGBTQ Scholarship',               'https://pointfoundation.org/point-apply/',                                                                        'html', 'US',          'foundation', 168, 'LGBTQ students in US.'),
  ('Pride Foundation Scholarships',                    'https://pridefoundation.org/grants-scholarships/scholarships/',                                                   'html', 'US',          'foundation', 168, 'LGBTQ students in US Pacific Northwest.'),

  -- ── Climate / sustainability dedicated ──────────────────────────────────
  ('ClimateWorks Foundation Fellowships',              'https://www.climateworks.org/grant-finder/',                                                                       'html', 'Global',      'foundation', 336, NULL),
  ('IUCN Climate Crisis Commission Fellowships',       'https://www.iucn.org/our-work/topic/climate-change',                                                              'html', 'Global',      'ngo',        336, NULL),
  ('Switzer Environmental Fellowship',                 'https://www.switzernetwork.org/become-fellow',                                                                    'html', 'US',          'foundation', 168, 'US graduate students in environmental fields.'),
  ('UNEP Young Champions of the Earth',                'https://www.unep.org/youngchampions/',                                                                            'html', 'Global',      'ngo',        336, NULL),
  ('Erasmus Mundus Climate-KIC Master',                'https://www.climate-kic.org/programmes/educational-programmes/',                                                  'html', 'EU',          'university', 168, NULL),

  -- ── Arts and humanities ─────────────────────────────────────────────────
  ('ACLS Mellon Fellowships',                          'https://www.acls.org/competitions/',                                                                              'html', 'US',          'foundation', 168, 'Humanities and social sciences; multiple tiers.'),
  ('Mellon/ACLS Public Fellows',                       'https://www.acls.org/competitions/mellon-acls-public-fellowship-program/',                                        'html', 'US',          'foundation', 168, NULL),
  ('Watson Fellowship',                                'https://watson.foundation/fellowships/tj',                                                                        'html', 'US',          'foundation', 168, 'Year of independent international travel/study.'),
  ('Wexner Foundation Fellowship',                     'https://wexnerfoundation.org/wexner-graduate-fellowship-davidson-scholars-program/',                              'html', 'US',          'foundation', 168, 'Jewish leadership; graduate study.'),
  ('Luce Scholars Program',                            'https://www.hluce.org/programs/luce-scholars/',                                                                   'html', 'Asia',        'foundation', 168, 'US grads working in Asia; non-Asian-studies majors.'),

  -- ── Disability / health-specific ────────────────────────────────────────
  ('NFB National Federation of the Blind Scholarships','https://nfb.org/programs-services/scholarships',                                                                  'html', 'US',          'ngo',        336, 'Legally blind US students.'),
  ('Lighthouse Guild Scholarships',                    'https://www.lighthouseguild.org/college-bound-scholarship/',                                                       'html', 'US',          'ngo',        336, 'Visually impaired US students.'),
  ('AbbVie Immunology Scholarship',                    'https://www.abbvie.com/our-company/community/abbvie-foundation/abbvie-scholarship.html',                          'html', 'US',          'foundation', 336, 'Students with chronic conditions.'),

  -- ── Indigenous and minority programs ────────────────────────────────────
  ('American Indian Graduate Center Fellowships',      'https://www.aigcs.org/scholarships-fellowships/',                                                                  'html', 'US',          'ngo',        168, 'Native American/Alaska Native graduate students.'),
  ('Cobell Scholarship',                               'https://cobellscholar.org/',                                                                                       'html', 'US',          'ngo',        336, 'Native American post-secondary.'),
  ('UNCF Scholarships',                                'https://uncf.org/scholarships',                                                                                    'html', 'US',          'ngo',        168, 'Black/African American US students; many sub-programs.'),
  ('Hispanic Scholarship Fund',                        'https://www.hsf.net/',                                                                                            'html', 'US',          'ngo',        168, 'Hispanic/Latino US students.'),
  ('Asian Pacific Fund Scholarships',                  'https://asianpacificfund.org/what-we-do/scholarships-internships/',                                                'html', 'US',          'ngo',        336, NULL),

  -- ── More European university flagships ─────────────────────────────────
  ('Trinity College Dublin Global Scholarship',        'https://www.tcd.ie/study/international/scholarships/',                                                            'html', 'Ireland',     'university', 168, NULL),
  ('University College Dublin International Scholarship','https://www.ucd.ie/global/scholarships/',                                                                       'html', 'Ireland',     'university', 168, NULL),
  ('University of Helsinki Scholarship',               'https://www.helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes/tuition-fees-and-scholarships', 'html', 'Finland', 'university', 168, NULL),
  ('Aalto University Scholarships',                    'https://www.aalto.fi/en/study-at-aalto/scholarships',                                                              'html', 'Finland',     'university', 168, NULL),
  ('University of Vienna Excellence Scholarship',      'https://international.univie.ac.at/incoming-students/scholarships/',                                                'html', 'Austria',     'university', 168, NULL),
  ('Sciences Po Émile Boutmy Scholarship',             'https://www.sciencespo.fr/students/en/scholarships/non-european-students/',                                        'html', 'France',      'university', 168, NULL),
  ('Sorbonne University International Scholarship',    'https://www.sorbonne-universite.fr/en/admissions/funding-your-studies/scholarships',                              'html', 'France',      'university', 168, NULL),
  ('Free University Berlin Scholarships',              'https://www.fu-berlin.de/en/studium/studienangebot/financing/index.html',                                          'html', 'Germany',     'university', 168, NULL),
  ('Heidelberg University Scholarships',               'https://www.uni-heidelberg.de/en/study/student-services/financing/scholarships',                                  'html', 'Germany',     'university', 168, NULL),
  ('Technical University of Munich Scholarships',      'https://www.tum.de/en/studies/fees-and-financial-aid/scholarships',                                                'html', 'Germany',     'university', 168, NULL),

  -- ── Three more aggregator hubs ──────────────────────────────────────────
  ('ScholarshipPortal',                                'https://www.scholarshipportal.com/',                                                                              'html', 'Global',      'aggregator', 336, 'HUB: searchable database; pass to discover-from-hub.'),
  ('Studyportals Scholarship Search',                  'https://www.studyportals.com/scholarships/',                                                                       'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.'),
  ('IEFA International Education Financial Aid',       'https://www.iefa.org/scholarships',                                                                                'html', 'Global',      'aggregator', 336, 'HUB: pass to discover-from-hub.')

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
