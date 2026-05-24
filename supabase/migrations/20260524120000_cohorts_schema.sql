-- Phase B1 — Top Uni cohort funnel: schema (membership-perk model).
-- Per plan ~/.claude/plans/im-still-confused-waht-woolly-cupcake.md
-- AND feedback_topuni_cohort_is_membership_perk.md (2026-05-23 revision).
--
-- Cohort group calls + workshops are a DELIVERY SURFACE for the existing
-- Top Uni membership subscription (pro/founding tier). Access is gated by
-- having an active row in `public.subscriptions` — NOT by a separate
-- cohort-specific payment flow.
--
-- An earlier draft of this migration had a `cohort_members` table with its
-- own Stripe checkout + status lifecycle. That created a parallel paid
-- product that would have cannibalized the membership ("buy the cohort OR
-- the membership?"). The Hormozi-clean version has one offer: the
-- membership. Cohorts make it more valuable; they aren't a second offer.
--
-- Three tables:
--   cohorts        — admin-managed: cycle definition (dates, capacity, themes)
--   cohort_events  — admin-managed: workshops, group calls, office hours
--   cohort_posts   — member-owned: async forum, AI-moderated before publish
--
-- "Who's a cohort member?" — anyone whose subscriptions row is currently
-- 'active' or 'trialing' AND whose subscription window overlaps the cohort's
-- date range. No separate enrollment row; the subscription IS the access.
-- This is enforced in RLS via the has_active_membership() helper below.

-- ─── helper: has_active_membership ──────────────────────────────────────────
-- Used by RLS policies on cohort_events + cohort_posts. SECURITY DEFINER so
-- the policy check can read subscriptions even when the policy's caller
-- (the cohort tables) doesn't have read access. Returns true if the user
-- has a current paying subscription.
CREATE OR REPLACE FUNCTION public.has_active_membership(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.subscriptions s
     WHERE s.user_id = p_user_id
       AND s.status IN ('active', 'trialing')
  );
$$;

COMMENT ON FUNCTION public.has_active_membership(UUID) IS
  'Returns true iff the user has an active/trialing subscription. Used by cohort_events + cohort_posts RLS to gate access to cohort deliverables to current paying members. Phase B1 v2 — membership-perk model 2026-05-23.';


-- ─── cohorts ────────────────────────────────────────────────────────────────
-- Cycle definition. Editor creates one per cohort intake. Status drives the
-- public visibility:
--   draft       — admin only, not shown on /cohorts
--   open        — accepting opt-ins (members can mark themselves into it)
--   in_progress — running; members see portal
--   completed   — finished, archived (members can still read posts/events)
--   cancelled   — never ran
--
-- price_cents stays as a column for upsell display ("this cohort would
-- cost $X if sold standalone"), but enrollment doesn't charge it — the
-- membership subscription does.
CREATE TABLE IF NOT EXISTS public.cohorts (
  cohort_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  max_members        SMALLINT CHECK (max_members IS NULL OR max_members BETWEEN 1 AND 200),
  price_cents        INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency           TEXT NOT NULL DEFAULT 'usd',
  -- Lightweight metadata bag (cal.com team event id, theme, materials URL, etc.)
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_status_starts
  ON public.cohorts (status, starts_at);
-- Member-facing "current cohort" query: a member is "in" any cohort whose
-- window overlaps now AND who has an active subscription. The starts_at +
-- ends_at filter is the hot path.
CREATE INDEX IF NOT EXISTS idx_cohorts_active_window
  ON public.cohorts (starts_at, ends_at)
  WHERE status IN ('open', 'in_progress');


-- ─── cohort_events ─────────────────────────────────────────────────────────
-- Workshops + group calls. Admin creates one row per scheduled session.
-- Members see them on the portal; reminder cron walks the table 24h + 1h
-- before each starts_at and fires reminder emails to active members.
--
-- kind:
--   group_call   — live cohort-wide call (Zoom/Cal.com link)
--   workshop     — themed deep-dive
--   office_hours — optional drop-in slot
--   external     — guest speaker / 3rd-party
CREATE TABLE IF NOT EXISTS public.cohort_events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       UUID NOT NULL REFERENCES public.cohorts(cohort_id) ON DELETE CASCADE,
  kind            TEXT NOT NULL
                    CHECK (kind IN ('group_call', 'workshop', 'office_hours', 'external')),
  title           TEXT NOT NULL,
  description     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  meeting_url     TEXT,
  -- Reminder-sent flags so the cron is idempotent against redeliveries.
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_1h_sent_at  TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohort_events_cohort_starts
  ON public.cohort_events (cohort_id, starts_at);
-- Cron's pickup window: events starting in the next 25 hours and not yet
-- reminded at the 24h mark. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS idx_cohort_events_reminder_24h_pending
  ON public.cohort_events (starts_at)
  WHERE reminder_24h_sent_at IS NULL;


-- ─── cohort_posts ──────────────────────────────────────────────────────────
-- Async forum within the cohort. AI moderation runs synchronously on
-- INSERT via the (future) cohort-post-moderate edge function (auto-approves
-- clean posts; flags hostile/off-topic for Samuel review).
--
-- user_id references auth.users directly — no intermediate cohort_members
-- table. Access is "active member, viewing posts from a cohort whose window
-- overlaps their subscription window."
--
-- status:
--   pending_moderation — just submitted, AI hasn't run yet (transient — usually <1s)
--   approved           — visible to active members of this cohort
--   flagged            — needs Samuel review; not visible
--   hidden             — admin hid it after the fact
CREATE TABLE IF NOT EXISTS public.cohort_posts (
  post_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id        UUID NOT NULL REFERENCES public.cohorts(cohort_id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_post_id   UUID REFERENCES public.cohort_posts(post_id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending_moderation'
                     CHECK (status IN ('pending_moderation', 'approved', 'flagged', 'hidden')),
  moderation_notes TEXT,
  moderated_at     TIMESTAMPTZ,
  edited_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohort_posts_cohort_visible
  ON public.cohort_posts (cohort_id, created_at DESC)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_cohort_posts_user
  ON public.cohort_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_posts_flagged
  ON public.cohort_posts (created_at DESC)
  WHERE status = 'flagged';


-- ─── updated_at triggers ───────────────────────────────────────────────────
CREATE TRIGGER cohorts_updated_at
  BEFORE UPDATE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);
CREATE TRIGGER cohort_events_updated_at
  BEFORE UPDATE ON public.cohort_events
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);


-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.cohorts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_posts   ENABLE ROW LEVEL SECURITY;

-- cohorts: anyone can SELECT non-draft cohorts (marketing pages show
-- upcoming + recent so non-members can see what they'd get).
CREATE POLICY "Public read non-draft cohorts"
  ON public.cohorts FOR SELECT
  USING (status <> 'draft');

CREATE POLICY "Admins manage cohorts"
  ON public.cohorts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cohort_events: active members see events for any non-draft cohort.
-- (Members get access to past + current + upcoming cohort programming as
-- long as they keep paying — that's the perk.)
CREATE POLICY "Active members see cohort events"
  ON public.cohort_events FOR SELECT
  TO authenticated
  USING (
    public.has_active_membership(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.cohorts c
       WHERE c.cohort_id = cohort_events.cohort_id
         AND c.status <> 'draft'
    )
  );

CREATE POLICY "Admins manage cohort_events"
  ON public.cohort_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cohort_posts: active members SELECT approved posts in non-draft cohorts;
-- always see their own posts regardless of status (so flagged-feedback
-- notes still show up to the author).
CREATE POLICY "Active members see approved cohort posts"
  ON public.cohort_posts FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND public.has_active_membership(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.cohorts c
       WHERE c.cohort_id = cohort_posts.cohort_id
         AND c.status <> 'draft'
    )
  );

CREATE POLICY "Members see own posts"
  ON public.cohort_posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Members can INSERT only as themselves AND only when they have an active
-- membership AND only into non-draft cohorts.
CREATE POLICY "Active members write own posts"
  ON public.cohort_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_active_membership(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.cohorts c
       WHERE c.cohort_id = cohort_posts.cohort_id
         AND c.status <> 'draft'
    )
  );

CREATE POLICY "Members edit own posts"
  ON public.cohort_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage cohort_posts"
  ON public.cohort_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ─── Documentation ─────────────────────────────────────────────────────────

COMMENT ON TABLE public.cohorts IS
  'Cohort cycle definition (one per intake). Membership perk — access gated by active subscriptions row, NOT by a separate enrollment / payment. Phase B1 v2 (2026-05-23 membership-perk pivot).';
COMMENT ON TABLE public.cohort_events IS
  'Workshops + group calls. Reminder cron walks reminder_*_sent_at flags for idempotent 24h+1h pings to active members.';
COMMENT ON TABLE public.cohort_posts IS
  'Async forum within a cohort. user_id → auth.users(id) directly; visibility gated by has_active_membership(auth.uid()). AI moderates on INSERT.';
