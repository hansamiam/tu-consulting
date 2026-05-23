-- Discover v1 — Phase A.7 fix: missing 4th T3 hub
--
-- The §1.1 audit doc keeps four T3 aggregators on the discovery whitelist.
-- Three are correctly seeded + active. The fourth — Opportunities Tracker —
-- Scholarships — was inserted on 2026-05-06 with the wrong domain
-- (opportunitytracker.ug, singular) and a stale path
-- (/single-category-2/scholarships/). The 20260505240000 seed tried to add
-- the correct URL (opportunitiestracker.ug/category/scholarships/) under
-- the same display name, but did not — likely the seed ran against a state
-- where the wrong row already existed and the unique constraint is on `url`,
-- not on `name`, so the new INSERT should have landed. Whatever the cause,
-- the live state is: 3/4 T3 hubs reachable, 1 hub stranded on a wrong domain
-- that Pass 1 correctly deactivated as non-whitelisted.
--
-- This migration is purely additive: INSERT the correctly-named hub. The
-- wrong-domain row stays deactivated per D6 reversibility (no DELETE, ever).
-- The display name collides with the wrong-row's display name, but
-- is_active + source_tier disambiguate them in /admin/sources.
--
-- Required before F13 (discover-from-hub-backfill) can iterate all 4 T3 hubs.

INSERT INTO public.scholarship_sources (
  name, url, source_type, region, category,
  parser_hint, frequency_hours, is_active, source_tier
) VALUES (
  'Opportunities Tracker — Scholarships',
  'https://opportunitiestracker.ug/category/scholarships/',
  'html',
  'Africa',
  'aggregator',
  'WordPress category page. Paginate via /page/N/. Each linked article describes one program — extract the official URL from the article body (NEVER store the aggregator article URL as official_url). Africa-weighted but covers global programs.',
  24,
  true,
  'aggregator_discovery_only'
)
ON CONFLICT (url) DO UPDATE SET
  is_active = true,
  source_tier = 'aggregator_discovery_only',
  deactivation_reason = NULL,
  deactivated_at = NULL,
  deactivation_policy_version = NULL,
  parser_hint = EXCLUDED.parser_hint,
  updated_at = now();
