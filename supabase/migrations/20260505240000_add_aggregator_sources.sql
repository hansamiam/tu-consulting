-- Add the two priority aggregator sources for round-19 catalog expansion.
--
-- opportunitiesforyouth.org — global aggregator with daily new
-- listings, Africa-weighted but covers all continents. Their hub
-- pages enumerate scholarships, grants, fellowships, jobs, and
-- conferences. We restrict our scrape targets to the scholarship +
-- fellowship category indexes; jobs/conferences aren't in scope.
--
-- opportunitiestracker.ug — Uganda-based aggregator with broad
-- African + global coverage. Listing-style hub pages we can crawl
-- the same way.
--
-- Both are aggregators, not primary sources. The scrape-source
-- pipeline's three-layer hygiene + the dedup v3 normalizer will
-- collapse duplicates against rows we already have from primary
-- providers; what survives is the long-tail programs we don't
-- have direct providers indexed for yet.
--
-- Frequency: 24h cadence matches the rest of the catalog. The
-- LLM extractor + content-hash check keep cost down on
-- unchanged pages.

INSERT INTO public.scholarship_sources (name, url, source_type, region, category, parser_hint, frequency_hours, is_active)
VALUES
  ('Opportunities for Youth — Scholarships',
   'https://opportunitiesforyouth.org/category/scholarships/',
   'html', 'Global', 'aggregator',
   'Aggregator listing page. Each linked article describes one scholarship. Extract program name (strip site branding like "| Opportunities for Youth"), provider, host country (single — use the country the program is hosted in, not the regional silo tag), eligibility (citizenship + degree level), award text + estimated USD, deadline (ISO date), and target_demographics if explicitly mentioned. Skip pages that are jobs/internships even if they appear in the listing — those aren''t scholarships.',
   24, true),

  ('Opportunities for Youth — Fellowships',
   'https://opportunitiesforyouth.org/category/fellowship/',
   'html', 'Global', 'aggregator',
   'Same parsing rules as the scholarships hub. Fellowship programs go in same scholarship table; coverage_type usually stipend or partial.',
   24, true),

  ('Opportunities Tracker — Scholarships',
   'https://opportunitiestracker.ug/category/scholarships/',
   'html', 'Africa', 'aggregator',
   'Africa-weighted aggregator listing. Same parsing rules as Opportunities for Youth. Many programs here are Africa-eligible — the host country may differ from the eligibility country, capture both correctly. citizenship_requirements should reflect the actual eligibility list, not the listing site''s regional tag.',
   24, true),

  ('Opportunities Tracker — Fellowships',
   'https://opportunitiestracker.ug/category/fellowships/',
   'html', 'Africa', 'aggregator',
   'Same as above for fellowship programs.',
   24, true)
ON CONFLICT (url) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  parser_hint = EXCLUDED.parser_hint,
  category = EXCLUDED.category,
  region = EXCLUDED.region,
  updated_at = now();
