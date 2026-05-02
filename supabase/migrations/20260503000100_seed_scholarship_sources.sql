-- Seed 20 high-quality scholarship sources to bootstrap the crawl pipeline.
-- These are the canonical international full-funding programs every
-- ambitious cross-border applicant should see. Crawl cadence varies by
-- source volatility (deadlines page = daily; static org page = weekly).

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, frequency_hours, parser_hint)
VALUES
  -- ── Government / national scholarship programs ──────────────────────────
  ('Chevening Scholarships',                  'https://www.chevening.org/scholarships/',                                                                       'html', 'UK',        'government',  24,
    'Look for award value, eligibility (one or two years of work experience), eligible countries list, deadline.'),
  ('Fulbright Foreign Student Program',       'https://foreign.fulbrightonline.org/about',                                                                     'html', 'US',        'government',  24,
    'Master''s and PhD funding for non-US citizens. Country quotas vary; treat as one umbrella program.'),
  ('DAAD Scholarship Database',               'https://www.daad.de/en/study-and-research-in-germany/scholarships/',                                            'html', 'Germany',   'government',  24,
    'Hub page links to many discrete programs — extract the umbrella + flag deeper crawl needed.'),
  ('MEXT Scholarship (Japan)',                'https://www.studyinjapan.go.jp/en/planning/scholarship/',                                                       'html', 'Japan',     'government',  24,
    'Multiple categories: Research, Undergraduate, Specialized Training. Treat as separate scholarships if listed.'),
  ('Australia Awards',                        'https://www.dfat.gov.au/people-to-people/australia-awards',                                                     'html', 'Australia', 'government',  48, NULL),
  ('Vanier Canada Graduate Scholarships',     'https://vanier.gc.ca/en/home-accueil.html',                                                                     'html', 'Canada',    'government',  48, NULL),
  ('New Zealand Scholarships',                'https://www.mfat.govt.nz/en/aid-and-development/scholarships/',                                                 'html', 'New Zealand','government', 48, NULL),
  ('Korean Government Scholarship Program',   'https://www.studyinkorea.go.kr/en/sub/gks/allnew_invite.do',                                                    'html', 'Korea',     'government',  48, NULL),
  ('Eiffel Excellence Scholarship',           'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence',                                      'html', 'France',    'government',  48, NULL),
  ('Swedish Institute Scholarships for Global Professionals','https://si.se/en/apply/scholarships/si-scholarships-for-global-professionals/',                  'html', 'Sweden',    'government',  72, NULL),
  ('Holland Scholarship',                     'https://www.studyinnl.org/finances/holland-scholarship',                                                        'html', 'Netherlands','government', 72, NULL),
  ('Commonwealth Scholarships (UK)',          'https://cscuk.fcdo.gov.uk/scholarships/',                                                                       'html', 'UK',        'government',  24, NULL),
  ('Erasmus Mundus Joint Masters',            'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters-scholarships','html', 'EU',        'government',  48, NULL),

  -- ── University / foundation flagships ───────────────────────────────────
  ('Rhodes Scholarship (Oxford)',             'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',                                         'html', 'UK',        'university',  72, NULL),
  ('Gates Cambridge Scholarship',             'https://www.gatescambridge.org/',                                                                                'html', 'UK',        'university',  72, NULL),
  ('Schwarzman Scholars (Tsinghua)',          'https://www.schwarzmanscholars.org/',                                                                            'html', 'China',     'university',  72, NULL),
  ('Knight-Hennessy Scholars (Stanford)',     'https://knight-hennessy.stanford.edu/',                                                                          'html', 'US',        'university',  72, NULL),
  ('Yenching Academy (Peking University)',    'https://yenchingacademy.pku.edu.cn/Programs/Admission.htm',                                                      'html', 'China',     'university',  72, NULL),

  -- ── NGO / Foundation programs ───────────────────────────────────────────
  ('Aga Khan Foundation International Scholarship','https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme',                'html', 'Global',    'ngo',         168, NULL),
  ('OFID Scholarship Award',                  'https://www.ofid.org/Apply-for-Funding/Scholarship',                                                             'html', 'Global',    'ngo',         168, NULL)

ON CONFLICT (url) DO UPDATE
  SET name           = EXCLUDED.name,
      source_type    = EXCLUDED.source_type,
      region         = EXCLUDED.region,
      category       = EXCLUDED.category,
      frequency_hours= EXCLUDED.frequency_hours,
      parser_hint    = COALESCE(EXCLUDED.parser_hint, public.scholarship_sources.parser_hint),
      is_active      = true;
