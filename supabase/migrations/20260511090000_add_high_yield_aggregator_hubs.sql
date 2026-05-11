-- Expand aggregator coverage for under-covered regions.
--
-- Existing hubs lean Global / Africa / Eastern Europe. These additions
-- target India, broader Asia, and global directories with deep
-- catalogs the current set doesn't reach.
--
-- Each is registered as category='aggregator' so it gets walked by
-- discover-from-hubs-cron (which now extracts individual program URLs
-- from listing pages — see migration 20260511050000 + the multi-page
-- walking in discover-from-hub).
--
-- Cadence is 336h (2 weeks) — matches the existing aggregator default
-- since discover-from-hubs-cron rotates through hubs every 6h
-- regardless of per-hub frequency.

INSERT INTO public.scholarship_sources
  (name, url, source_type, region, category, frequency_hours, parser_hint, is_active)
VALUES
  -- Buddy4Study — India's biggest scholarship aggregator. Tons of
  -- programs targeting Indian + South Asian students applying both
  -- domestic and abroad. Article-per-program with deep eligibility.
  ('Buddy4Study Scholarships',
   'https://www.buddy4study.com/scholarships',
   'html', 'Asia', 'aggregator', 336,
   'HUB: India-focused aggregator. Individual scholarship pages have funding amounts (often INR — convert to USD via FX in the LLM extractor), deadlines, eligibility for Indian and South Asian students. Many programs target undergrad + master''s applicants to US/UK/EU.',
   true),

  -- StudyAbroadAid — international scholarships oriented for Asian
  -- (especially East Asian) students. Mostly free-form articles per
  -- program with deadline + funding.
  ('Study Abroad Aid',
   'https://www.studyabroadaid.com/',
   'html', 'Asia', 'aggregator', 336,
   'HUB: aggregator with strong Asia coverage. Each article = one program. Extract per standard scrape-source rules.',
   true),

  -- Erudera — global aggregator with searchable filters. Listing pages
  -- enumerate programs by country/level.
  ('Erudera Scholarships Index',
   'https://erudera.com/scholarships/',
   'html', 'Global', 'aggregator', 336,
   'HUB: global aggregator. Listing format with program-page links. Pass to discover-from-hub for per-program harvest.',
   true),

  -- After School Africa — sister site to opportunities-for-youth with
  -- weekly fresh content. Already covered the .com level; this adds
  -- the dedicated fellowships index.
  ('After School Africa Fellowships',
   'https://www.afterschoolafrica.com/category/fellowships/',
   'html', 'Africa', 'aggregator', 336,
   'HUB: Africa-focused fellowships listing. Articles cover programs open to African students globally.',
   true),

  -- ScholarshipDB — large global searchable DB. Listing pages have
  -- per-program permalinks.
  ('ScholarshipDB',
   'https://scholarshipdb.net/scholarships',
   'html', 'Global', 'aggregator', 336,
   'HUB: global searchable database. Each listing links to a per-program page with full eligibility + funding + deadlines.',
   true),

  -- Opportunities for International Students — focused on programs
  -- open to international applicants. Daily updates.
  ('International Students Aggregator',
   'https://www.opportunitiesforinternationalstudents.com/',
   'html', 'Global', 'aggregator', 336,
   'HUB: aggregator for programs open to international applicants. Article-per-program structure with eligibility + deadlines.',
   true)
ON CONFLICT (url) DO UPDATE SET
  is_active   = EXCLUDED.is_active,
  parser_hint = EXCLUDED.parser_hint,
  category    = EXCLUDED.category,
  region      = EXCLUDED.region,
  updated_at  = now();
