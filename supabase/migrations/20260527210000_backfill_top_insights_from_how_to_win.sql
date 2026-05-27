-- Backfill scholarship_mini_guides.top_insights from
-- content -> 'how_to_win' (first 3 items) for every row that has the
-- legacy multi-section guide populated but no top_insights yet.
--
-- This makes the 3-bullet Top Uni Insights surface light up across
-- the catalog without any new content authoring — the existing
-- how_to_win lines are already the strategist's "top moves," so
-- they map cleanly onto the 3-bullet UX.
--
-- Idempotent. Only touches rows where top_insights is empty AND the
-- JSONB how_to_win array has at least 3 elements.

UPDATE public.scholarship_mini_guides AS m
SET top_insights = ARRAY[
      m.content -> 'how_to_win' ->> 0,
      m.content -> 'how_to_win' ->> 1,
      m.content -> 'how_to_win' ->> 2
    ]::text[]
WHERE (m.top_insights IS NULL OR coalesce(array_length(m.top_insights, 1), 0) < 3)
  AND jsonb_typeof(m.content -> 'how_to_win') = 'array'
  AND jsonb_array_length(m.content -> 'how_to_win') >= 3;
