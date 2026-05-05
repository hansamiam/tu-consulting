-- Pipeline essay drafts
--
-- Lets a member draft the scholarship's essay directly inside the
-- pipeline row instead of bouncing to a separate doc. Round 13's
-- core retention play: the user comes back to /pipeline daily during
-- application season because their drafts live there.
--
-- One draft per (user_id, scholarship_id) for now. Some scholarships
-- have multiple essay prompts; v1 punts on that and stores a single
-- composed draft. If/when we want multi-prompt support we'll move
-- into a separate `pipeline_essays` table keyed by ord.
--
-- The hook (useApplicationTracker) feature-detects this column the
-- same way it does awarded_amount_usd, so client code continues to
-- work pre- and post-migration.

ALTER TABLE public.application_tracker
  ADD COLUMN IF NOT EXISTS essay_draft text
    CHECK (essay_draft IS NULL OR length(essay_draft) <= 50000);
