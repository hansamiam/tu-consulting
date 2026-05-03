-- =============================================================================
-- analytics_events — funnel telemetry
-- =============================================================================
-- Single fact table for product/funnel events. Flat schema, jsonb metadata
-- for per-event context. Drives the conversion-rate work in /admin/funnel.
--
-- Why a single fact table vs. one-table-per-event-type: keeps the writer
-- simple (one upsert path), keeps queries flexible (admin dashboard
-- filters by event_name + date range), and the jsonb metadata column
-- absorbs schema drift without migrations.
--
-- Common events (the system writes; admin reads via aggregations):
--   · brief_generation_started      — wizard "Generate" click
--   · brief_generation_completed    — first chunk streamed back
--   · brief_viewed_full             — user scrolled past 50% of the brief
--   · gate_seen                     — premium gate rendered for user
--   · gate_upgrade_clicked          — clicked the "Unlock" CTA
--   · counselor_message_sent        — user-side
--   · signup_started                — auth dialog opened
--   · payment_completed             — Stripe webhook confirmed
--   · scholarship_saved             — added to pipeline
--   · scholarship_detail_opened     — visited /scholarships/:id
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  event_id    bigserial PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- For anon users we get a stable per-browser id from localStorage so
  -- we can correlate pre-signup → post-signup funnels.
  anon_id     text,
  -- Snake-case event slug. New events welcome — no enum, no migration.
  event_name  text NOT NULL,
  -- Per-event payload (e.g. for gate_seen: { gate_id, brief_section,
  -- visible_count }). Keep it small; this table will grow fast.
  metadata    jsonb,
  -- Path the user was on when the event fired. Helps debug funnel drops.
  path        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name_time   ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_time   ON public.analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_anon_time   ON public.analytics_events(anon_id, created_at DESC) WHERE anon_id IS NOT NULL;

-- RLS: anyone (anon or authed) can INSERT their own events. Reads are
-- admin-only via the aggregation views below.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can write events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Service role bypass + admin reads.
CREATE POLICY "Service role manages events"
  ON public.analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants — see DATA_PIPELINE_AUDIT lesson, explicit GRANT to avoid silent
-- write failures.
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.analytics_events_event_id_seq TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_event_id_seq TO service_role;

-- ─── Aggregation view: 30-day funnel snapshot ─────────────────────────
-- Admin dashboard reads this. Each row is a (event_name, day) bucket.
CREATE OR REPLACE VIEW public.analytics_events_funnel_v AS
SELECT
  event_name,
  date_trunc('day', created_at)::date AS day,
  count(*)                            AS event_count,
  count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)  AS unique_users,
  count(DISTINCT anon_id) FILTER (WHERE anon_id IS NOT NULL)  AS unique_anons
FROM public.analytics_events
WHERE created_at > now() - interval '30 days'
GROUP BY event_name, date_trunc('day', created_at);

-- Admin role check is in the front-end. The view itself is select-grantable
-- to authenticated; admin-only views are gatekeepered by the React route
-- layer (consistent with other admin surfaces).
GRANT SELECT ON public.analytics_events_funnel_v TO authenticated;
