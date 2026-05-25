-- Add FellowshipsGuide.com as an aggregator hub.
--
-- Global aggregator with per-program permalinks (slug pattern
-- /<program-name>/) — exactly the structure discover-from-hub walks.
-- Skews PhD / postdoc / fully-funded master's, with strong coverage
-- of EU + UK + Asia (Japan, Taiwan) + Canada institutions. Fills
-- under-served PhD/postdoc tier alongside the existing Buddy4Study /
-- ScholarshipDB / Erudera hubs.
--
-- Category 'scholarships' index is the cleaner pagination surface
-- than the homepage's load-more pattern.

INSERT INTO public.scholarship_sources
  (name, url, source_type, region, category, frequency_hours, parser_hint, is_active)
VALUES
  ('FellowshipsGuide',
   'https://fellowshipsguide.com/category/scholarships/',
   'html', 'Global', 'aggregator', 336,
   'HUB: global fellowship + scholarship aggregator. One program per article; URL slug pattern /<program-name>/. Heavy on PhD, postdoc, fully-funded master''s. Strong EU/UK/Asia/Canada coverage. Extract funding amount, eligibility (nationality + level), deadline per standard scrape-source rules. Pass to discover-from-hub for per-program harvest.',
   true)
ON CONFLICT (url) DO UPDATE SET
  is_active   = EXCLUDED.is_active,
  parser_hint = EXCLUDED.parser_hint,
  category    = EXCLUDED.category,
  region      = EXCLUDED.region,
  updated_at  = now();
