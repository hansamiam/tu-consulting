-- =============================================================================
-- Scholarship scraping engine + rate-limit substrate
-- =============================================================================
-- Adds the infra to keep the scholarships DB fresh automatically:
--   • scholarship_sources    — curated URL list we crawl on a schedule
--   • scholarships_staging   — pending / auto-published extractions per crawl
--   • scrape_runs            — per-attempt audit log
--   • scrape_errors          — persistent error log for failure forensics
--   • rate_limit_buckets     — per-minute counters for AI endpoint protection
--
-- Plus an SQL function `check_and_increment_rate_limit(key, max)` that edge
-- functions call to enforce per-IP / per-user limits without an external dep.
--
-- All tables are admin-readable via the existing has_role() function and
-- service-role-writable. The cron dispatcher and scrape worker run with the
-- service role so they bypass RLS as expected.
-- =============================================================================

-- Shared updated_at trigger fn (idempotent — already created in earlier
-- migration but redefining is safe and keeps this file self-contained).
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ─── Sources we crawl ──────────────────────────────────────────────────────
-- Curated by an admin. Each row is a URL we re-fetch on its own cadence.
-- A source can yield 0..N scholarships per crawl (some pages are listings).
CREATE TABLE IF NOT EXISTS public.scholarship_sources (
  source_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  url                    text NOT NULL UNIQUE,
  source_type            text NOT NULL DEFAULT 'html'
                           CHECK (source_type IN ('html','rss','sitemap')),
  region                 text,                  -- "UK", "Global", "EU" — informational
  category               text,                  -- "government","university","ngo","aggregator"
  parser_hint            text,                  -- free-text guidance for the LLM extractor
  frequency_hours        int  NOT NULL DEFAULT 24,
  last_crawled_at        timestamptz,
  last_success_at        timestamptz,
  last_content_hash      text,                  -- skip LLM call when page unchanged
  consecutive_failures   int  NOT NULL DEFAULT 0,
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_due
  ON public.scholarship_sources (last_crawled_at NULLS FIRST)
  WHERE is_active;

DROP TRIGGER IF EXISTS trg_sources_updated ON public.scholarship_sources;
CREATE TRIGGER trg_sources_updated
  BEFORE UPDATE ON public.scholarship_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── Per-attempt audit log ─────────────────────────────────────────────────
-- One row per scrape attempt. Lets us answer "is the pipeline healthy" and
-- "how much did this week's crawls cost in LLM/Firecrawl spend".
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  run_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id              uuid NOT NULL REFERENCES public.scholarship_sources(source_id) ON DELETE CASCADE,
  started_at             timestamptz NOT NULL DEFAULT now(),
  finished_at            timestamptz,
  status                 text NOT NULL DEFAULT 'running'
                           CHECK (status IN ('running','success','content_unchanged','failed','skipped')),
  scholarships_found     int DEFAULT 0,
  scholarships_new       int DEFAULT 0,
  scholarships_updated   int DEFAULT 0,
  auto_published         int DEFAULT 0,
  needs_review           int DEFAULT 0,
  error_message          text,
  duration_ms            int,
  cost_estimate_usd      numeric(8,4) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_runs_source_started
  ON public.scrape_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status_started
  ON public.scrape_runs(status, started_at DESC);

-- ─── Staging area for extracted scholarships ───────────────────────────────
-- Every extraction lands here first. High-confidence rows auto-publish
-- straight to public.scholarships; low-confidence sit in 'pending' for an
-- admin to approve/reject in /admin/queue.
CREATE TABLE IF NOT EXISTS public.scholarships_staging (
  staging_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id              uuid NOT NULL REFERENCES public.scholarship_sources(source_id) ON DELETE CASCADE,
  run_id                 uuid REFERENCES public.scrape_runs(run_id) ON DELETE SET NULL,
  -- If this extraction matches an existing scholarship, link it; otherwise null = brand new.
  scholarship_id         uuid REFERENCES public.scholarships(scholarship_id) ON DELETE SET NULL,
  -- sha256(name + provider + host_country) — stable identity even if other fields shift
  fingerprint            text NOT NULL,
  raw_text               text,                  -- snippet from source for debugging
  parsed_data            jsonb NOT NULL,        -- the structured extraction
  confidence             numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  -- Set when this is an UPDATE to an existing scholarship — summary of changes
  diff_summary           text,
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected','auto_published','superseded')),
  rejection_reason       text,
  reviewed_by            uuid REFERENCES auth.users(id),
  reviewed_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staging_status_created
  ON public.scholarships_staging(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_source
  ON public.scholarships_staging(source_id);
-- Only ONE pending row per fingerprint at a time — prevents the same
-- scholarship piling up in the queue across multiple crawls.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staging_fingerprint_pending
  ON public.scholarships_staging(fingerprint)
  WHERE status = 'pending';

-- ─── Persistent error log ──────────────────────────────────────────────────
-- More detail than scrape_runs.error_message — one row per discrete error
-- inside a run (e.g. 3 scholarships failed validation in a 10-scholarship run).
CREATE TABLE IF NOT EXISTS public.scrape_errors (
  error_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id              uuid REFERENCES public.scholarship_sources(source_id) ON DELETE CASCADE,
  run_id                 uuid REFERENCES public.scrape_runs(run_id) ON DELETE CASCADE,
  error_class            text,                  -- 'fetch_failed','parse_failed','validation_failed','llm_failed'
  error_message          text,
  http_status            int,
  context                jsonb,                 -- arbitrary structured debugging payload
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_errors_source_created
  ON public.scrape_errors(source_id, created_at DESC);

-- ─── Rate limit substrate ──────────────────────────────────────────────────
-- Simple per-minute bucket counter. Edge functions call
-- check_and_increment_rate_limit() which atomically increments + returns
-- whether the request is under the limit. Old buckets are best-effort GC'd
-- inside the function (cheap because the table stays tiny).
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key             text NOT NULL,         -- e.g. "match:anon:1.2.3.4" or "essay:user:<uuid>"
  window_start           timestamptz NOT NULL,  -- truncated to minute
  request_count          int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON public.rate_limit_buckets(window_start);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key            text,
  p_max_per_minute int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz := date_trunc('minute', now());
  v_count  int;
BEGIN
  INSERT INTO public.rate_limit_buckets(bucket_key, window_start, request_count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;

  -- Best-effort cleanup of stale buckets (>1h old) — runs cheaply because
  -- of the window_start index. Doesn't block the caller in any meaningful way.
  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '1 hour';

  RETURN v_count <= p_max_per_minute;
END;
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.scholarship_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships_staging   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_errors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets     ENABLE ROW LEVEL SECURITY;

-- Admin (has_role) reads + writes for the infra tables; service role bypasses RLS.
DROP POLICY IF EXISTS "admin_read_sources"  ON public.scholarship_sources;
DROP POLICY IF EXISTS "admin_write_sources" ON public.scholarship_sources;
CREATE POLICY "admin_read_sources"  ON public.scholarship_sources  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_write_sources" ON public.scholarship_sources  FOR ALL    TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_read_staging"  ON public.scholarships_staging;
DROP POLICY IF EXISTS "admin_write_staging" ON public.scholarships_staging;
CREATE POLICY "admin_read_staging"  ON public.scholarships_staging FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_write_staging" ON public.scholarships_staging FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_read_runs"     ON public.scrape_runs;
CREATE POLICY "admin_read_runs"     ON public.scrape_runs          FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_read_errors"   ON public.scrape_errors;
CREATE POLICY "admin_read_errors"   ON public.scrape_errors        FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- rate_limit_buckets: nobody reads/writes via API; only the SECURITY DEFINER
-- function touches it. Empty policy set + RLS on = closed by default.

GRANT ALL    ON public.scholarship_sources, public.scholarships_staging,
                public.scrape_runs, public.scrape_errors,
                public.rate_limit_buckets TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int)
  TO authenticated, anon, service_role;
