-- Top Uni Insights — 3-bullet right-panel block.
--
-- Adds a hand-written 3-item bullet array to scholarship_mini_guides.
-- The existing `content` JSONB (who_fits / how_to_win / what_to_prepare /
-- typical_admit / watch_out) stays intact — it ran too long for the
-- right-panel pull-up; we keep the data for a future surface and render
-- only this short bullet set in the pull-up.
--
-- Constraint: exactly 3 items when present. Null is allowed and means
-- "not yet written" — the UI shows a "Top Uni notes coming soon"
-- placeholder in that case (preserves PR #200 behavior).

alter table public.scholarship_mini_guides
  add column if not exists top_insights text[];

-- Drop and recreate the constraint idempotently (alter table add constraint
-- has no `if not exists` in older Postgres).
alter table public.scholarship_mini_guides
  drop constraint if exists scholarship_mini_guides_top_insights_len_chk;

alter table public.scholarship_mini_guides
  add constraint scholarship_mini_guides_top_insights_len_chk
  check (top_insights is null or array_length(top_insights, 1) = 3);

comment on column public.scholarship_mini_guides.top_insights is
  '3-bullet "Top Uni Insights" rendered in the Discover right-panel pull-up.
   Hand-written, bulk-uploaded from a doc. Null until uploaded — UI falls
   back to a "Top Uni notes coming soon" placeholder.';
