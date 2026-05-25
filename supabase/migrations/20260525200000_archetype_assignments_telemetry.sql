-- Telemetry: log every archetype assignment + the intake that produced it.
-- Goal: in 2-4 weeks accumulate enough rows to audit the library — which
-- archetypes fire <2% (kill/merge), which overflow >25% (split), and which
-- intake shapes the detector misses entirely. The library was designed by
-- intuition; this table makes the redesign data-driven.
--
-- intake_snapshot is the full normalized profile at assignment time, so we
-- can replay assignments against a future detector revision.
create table if not exists archetype_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  archetype_id text not null,
  confidence smallint,
  reason text,
  intake_snapshot jsonb,
  detector_version text not null default 'v1',
  assigned_at timestamptz not null default now()
);

create index if not exists archetype_assignments_archetype_idx
  on archetype_assignments(archetype_id, assigned_at desc);
create index if not exists archetype_assignments_user_idx
  on archetype_assignments(user_id, assigned_at desc);

alter table archetype_assignments enable row level security;

-- Users can read their own assignments. Inserts come from edge functions
-- running under the service role, which bypasses RLS — no insert policy
-- needed (and we don't want one; users shouldn't be able to write).
create policy archetype_assignments_user_read on archetype_assignments
  for select using (auth.uid() = user_id);
