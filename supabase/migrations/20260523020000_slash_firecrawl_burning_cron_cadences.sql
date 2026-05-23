-- Slash Firecrawl burn from runaway cron cadences.
--
-- Samuel hit a 10,000-credit Firecrawl exhaustion on 2026-05-23. Investigation
-- showed three crons running on cadences sized for a much larger catalog:
--
--   verify-scholarship-cron : */30 × 200 Firecrawl/run = 9,600/day
--   promote-pending-cron    : */10 × 12  Firecrawl/run = 1,728/day
--   scholarship-url-health  : 0 */4 × ~100 Firecrawl/run = 600/day
--                                                    -----------
--                                                     ~11,928/day
--
-- Catalog is 583 rows, of which ~200 actually re-verifiable in a single
-- run. So the */30 cadence was refreshing the entire catalog every 90
-- minutes — far in excess of the 90-day G9b verification staleness
-- window. Daily ticks give the catalog a fresh refresh once every 24h,
-- which leaves an 89-day buffer before any row goes stale.
--
-- Post-change estimated burn:
--   verify-scholarship-cron : 1 × 200 = 200/day
--   promote-pending-cron    : 1 × 12  = 12/day
--   scholarship-url-health  : 1 × 100 = 100/day
--                                       --------
--                                       ~312/day
--
-- That's ~30 days of catalog refresh on the 10,000-credit Firecrawl plan
-- instead of <24 hours. ~38× more runway, same coverage.
--
-- The offset minutes (5/15/30 past the hour) stagger the crons so they
-- don't all hammer the gateway at once.
--
-- Reversible — restore the high-cadence schedules via cron.alter_job if
-- the catalog grows to a size that needs faster refresh.

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'verify-scholarship-cron'),
  schedule := '0 5 * * *'
);

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'promote-pending-cron'),
  schedule := '15 5 * * *'
);

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'scholarship-url-health-cron'),
  schedule := '30 5 * * *'
);
