-- Phase B1 — Top Uni cohort funnel: foundation schema.
-- Per plan ~/.claude/plans/im-still-confused-waht-woolly-cupcake.md.
--
-- Replaces the 1-on-1 consulting model with monthly/biweekly cohort cycles.
-- Each cohort is a fixed group (8-12 members) sharing live group calls,
-- workshops, an async forum (posts), and a portal page rendered at
-- /cohorts/:slug. Enrollment goes through Stripe subscriptions (extension
-- of create-checkout); the welcome+reminder crons fire on pg_cron.
--
-- Four tables:
--   cohorts          — admin-managed: cycle definition (dates, capacity, SKU)
--   cohort_members   — user-owned: one row per (cohort, person) enrollment
--   cohort_events    — admin-managed: workshops, group calls, office hours
--   cohort_posts     — member-owned: async forum, AI-moderated before publish
--
-- RLS pattern matches existing tu-consulting tables:
--   - Public SELECT on cohorts (anyone can see open cohorts to enroll)
--   - Members SELECT their own cohort's data; admins SELECT/INSERT/UPDATE all
--   - cohort_members.user_id = auth.uid() for own-row visibility
--
-- Naming: no "topuni_" prefix because the rest of the schema doesn't use
-- one (scholarships, providers, bookings, etc.). Plain table names match
-- the existing convention.

-- ─── cohorts ────────────────────────────────────────────────────────────────
-- Cycle definition. Editor creates one per cohort intake. Status drives the
-- public visibility:
--   draft       — admin only, not shown on /cohorts
--   open        — enrollment open, shown on /cohorts
--   closed      — enrollment shut (full or past start date), still shown
--   in_progress — running; members see portal, not new enrollments
--   completed   — finished, archived
--   cancelled   — never ran
CREATE TABLE IF NOT EXISTS public.cohorts (
  cohort_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  enrollment_closes_at TIMESTAMPTZ,
  max_members        SMALLINT NOT NULL DEFAULT 12 CHECK (max_members BETWEEN 1 AND 100),
  price_cents        INTEGER NOT NULL CHECK (price_cents >= 0),
  currency           TEXT NOT NULL DEFAULT 'usd',
  -- Stripe product_key — matches create-checkout's CATALOG entry that the
  -- enrollment flow will look up. e.g. 'cohort_2026_09_mba'.
  stripe_product_key TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled')),
  -- Lightweight metadata bag (cal.com team event id, Slack channel, etc.)
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_status_starts
  ON public.cohorts (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_cohorts_open_starts
  ON public.cohorts (starts_at)
  WHERE status = 'open';


-- ─── cohort_members ────────────────────────────────────────────────────────
-- One row per (cohort, person) enrollment. user_id is nullable so we can
-- accept enrollments from emails that haven't signed up yet; later flows
-- backfill user_id when the auth.users row materializes.
--
-- status:
--   pending    — payment in flight (Stripe checkout session created, not yet paid)
--   enrolled   — paid, welcome email queued, awaiting cohort start
--   active     — cohort has started, member is current
--   churned    — refunded or sub cancelled mid-cohort
--   completed  — cohort completed, member is alumni
CREATE TABLE IF NOT EXISTS public.cohort_members (
  member_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id              UUID NOT NULL REFERENCES public.cohorts(cohort_id) ON DELETE CASCADE,
  user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                  TEXT NOT NULL,
  display_name           TEXT,
  stripe_session_id      TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'enrolled', 'active', 'churned', 'completed')),
  enrolled_at            TIMESTAMPTZ,
  churned_at             TIMESTAMPTZ,
  churn_reason           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One enrollment per (cohort, email). Idempotent re-enrollment from Stripe
-- webhook redeliveries flips status without creating duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_members_unique
  ON public.cohort_members (cohort_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_cohort_members_user
  ON public.cohort_members (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cohort_members_active
  ON public.cohort_members (cohort_id, status)
  WHERE status IN ('enrolled', 'active');


-- ─── cohort_events ─────────────────────────────────────────────────────────
-- Workshops, group calls, office hours. Admin creates one row per scheduled
-- session. Members see them on the portal; reminder cron walks the table
-- 24h + 1h before each starts_at and fires reminder emails.
--
-- kind:
--   group_call   — live cohort-wide call (Zoom/Cal.com link)
--   workshop     — themed deep-dive (admin can attach materials in metadata)
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
  -- Reminders sent flags so the cron is idempotent against redeliveries.
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
-- INSERT via cohort-post-moderate edge function (auto-approves clean
-- posts; flags hostile/off-topic for Samuel review).
--
-- status:
--   pending_moderation — just submitted, AI hasn't run yet (transient — usually <1s)
--   approved           — visible to cohort members
--   flagged            — needs Samuel review; not visible
--   hidden             — admin hid it after the fact
CREATE TABLE IF NOT EXISTS public.cohort_posts (
  post_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id        UUID NOT NULL REFERENCES public.cohorts(cohort_id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES public.cohort_members(member_id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_cohort_posts_member
  ON public.cohort_posts (member_id);
CREATE INDEX IF NOT EXISTS idx_cohort_posts_flagged
  ON public.cohort_posts (created_at DESC)
  WHERE status = 'flagged';


-- ─── updated_at triggers ───────────────────────────────────────────────────
-- Same pattern as other tu-consulting tables. moddatetime extension is
-- already enabled project-wide.

CREATE TRIGGER cohorts_updated_at
  BEFORE UPDATE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);
CREATE TRIGGER cohort_members_updated_at
  BEFORE UPDATE ON public.cohort_members
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);
CREATE TRIGGER cohort_events_updated_at
  BEFORE UPDATE ON public.cohort_events
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);


-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.cohorts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_posts     ENABLE ROW LEVEL SECURITY;

-- cohorts: anyone can SELECT cohorts that aren't drafts (homepage shows
-- open cohorts; the marketing page lists upcoming + recent).
CREATE POLICY "Public read non-draft cohorts"
  ON public.cohorts FOR SELECT
  USING (status <> 'draft');

CREATE POLICY "Admins manage cohorts"
  ON public.cohorts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cohort_members: a user sees their own enrollment + roster of cohorts they
-- belong to. Admins see all.
CREATE POLICY "Members see own enrollment"
  ON public.cohort_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members see cohort-mates"
  ON public.cohort_members FOR SELECT
  TO authenticated
  USING (cohort_id IN (
    SELECT cohort_id FROM public.cohort_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins manage cohort_members"
  ON public.cohort_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cohort_events: members see events for cohorts they belong to. Admins all.
CREATE POLICY "Members see cohort events"
  ON public.cohort_events FOR SELECT
  TO authenticated
  USING (cohort_id IN (
    SELECT cohort_id FROM public.cohort_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins manage cohort_events"
  ON public.cohort_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cohort_posts: members see approved posts in their cohort + their own
-- (regardless of status, so they see flagged feedback). Insert allowed when
-- the member_id refers to an enrolled row owned by the current user.
CREATE POLICY "Members see approved cohort posts"
  ON public.cohort_posts FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND cohort_id IN (
      SELECT cohort_id FROM public.cohort_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members see own posts"
  ON public.cohort_posts FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT member_id FROM public.cohort_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members write own posts"
  ON public.cohort_posts FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT member_id FROM public.cohort_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members edit own posts"
  ON public.cohort_posts FOR UPDATE
  TO authenticated
  USING (member_id IN (
    SELECT member_id FROM public.cohort_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (member_id IN (
    SELECT member_id FROM public.cohort_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins manage cohort_posts"
  ON public.cohort_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ─── Documentation ─────────────────────────────────────────────────────────

COMMENT ON TABLE public.cohorts IS
  'Cohort cycle definition (one per intake). Phase B1 — Top Uni cohort funnel, replaces 1-on-1 consulting model. Per ~/.claude/plans/im-still-confused-waht-woolly-cupcake.md.';
COMMENT ON TABLE public.cohort_members IS
  'Enrollment record — one row per (cohort, person). user_id nullable to accept email-only enrollments before signup; backfilled when auth.users materializes.';
COMMENT ON TABLE public.cohort_events IS
  'Workshops + group calls. Reminder cron (cohort-reminder-cron) walks reminder_*_sent_at flags for idempotent 24h+1h pings.';
COMMENT ON TABLE public.cohort_posts IS
  'Async forum within a cohort. AI moderates on INSERT (cohort-post-moderate edge function). Flagged posts surface to Samuel; others auto-publish.';
