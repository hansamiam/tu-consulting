-- Discover v1 — Phase A.2
-- source_candidates: discovery queue. When discover-from-hub scans a
-- whitelisted T3 aggregator (opportunitiesforyouth.org, opportunitiestracker.ug)
-- and finds a program we don't yet have a T1/T2 source for, it lands here.
-- An admin then approves the candidate, which inserts a real row into
-- scholarship_sources with the official URL (NOT the aggregator URL).
--
-- Per spec D4: "Aggregator URL is never stored as official_url. Aggregator-hosted
-- intake forms are skipped — we never become a re-host of someone else's intake."

CREATE TABLE IF NOT EXISTS public.source_candidates (
  candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What we found
  candidate_official_url TEXT NOT NULL,
  proposed_name TEXT,
  proposed_provider TEXT,
  proposed_host_country TEXT,
  proposed_deadline DATE,
  proposed_coverage_type TEXT,
  proposed_award_amount_text TEXT,

  -- Where we found it
  discovered_from_url TEXT NOT NULL,
  discovered_from_source_id UUID REFERENCES public.scholarship_sources(source_id) ON DELETE SET NULL,

  -- LLM extraction trust signal (0–1, see scrape-source confidence convention)
  extraction_confidence NUMERIC(3,2)
    CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
  extraction_notes TEXT,

  -- Review lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate_of_existing_source')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- If approved, what scholarship_source row we created from this candidate
  promoted_to_source_id UUID REFERENCES public.scholarship_sources(source_id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent re-queuing the same candidate URL while one is pending.
-- (We allow duplicate URLs across statuses because a previously-rejected one might
-- legitimately re-appear later with better extraction.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_candidates_pending_url_unique
  ON public.source_candidates (candidate_official_url)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_source_candidates_status_created
  ON public.source_candidates (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_candidates_discovered_from
  ON public.source_candidates (discovered_from_source_id);

ALTER TABLE public.source_candidates ENABLE ROW LEVEL SECURITY;

-- Only admins read/write; no public access (this is internal triage data).
CREATE POLICY "Admins read source_candidates"
  ON public.source_candidates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write source_candidates"
  ON public.source_candidates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role (edge functions) can insert candidates from the discovery cron.
CREATE POLICY "Service role inserts source_candidates"
  ON public.source_candidates FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE public.source_candidates IS
  'Discovery queue for T3 aggregator scans. The discover-from-hub edge function inserts here when it finds a program whose official URL we do not yet have in scholarship_sources. Admin reviews at /admin/source_candidates and approves to create the real T1/T2 source row. Per Discover v1 plan 2026-05-22.';
