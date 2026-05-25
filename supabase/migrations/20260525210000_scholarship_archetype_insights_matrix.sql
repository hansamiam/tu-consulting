-- The (scholarship × archetype) insight matrix — replaces the per-view
-- LLM "scholarship-deep-dive" with a pre-generated single-sentence
-- "fortune cookie" cell. Insight is null when the archetype is
-- structurally ineligible/non-applicable for that scholarship (the
-- eligibility hard-gate runs BEFORE the LLM in the generator function,
-- so we never hallucinate a fit for someone the scholarship excludes).
--
-- Public-read because Discover is a public page; insights contain no PII.
create table if not exists scholarship_archetype_insights (
  scholarship_id uuid not null references scholarships(scholarship_id) on delete cascade,
  archetype_id text not null,
  insight_text text,
  eligibility_skipped boolean not null default false,
  skip_reason text,
  generator_model text,
  prompt_version smallint not null default 1,
  generated_at timestamptz not null default now(),
  primary key (scholarship_id, archetype_id)
);

create index if not exists scholarship_archetype_insights_scholarship_idx
  on scholarship_archetype_insights(scholarship_id);
create index if not exists scholarship_archetype_insights_archetype_idx
  on scholarship_archetype_insights(archetype_id);

alter table scholarship_archetype_insights enable row level security;
create policy scholarship_archetype_insights_public_read
  on scholarship_archetype_insights for select using (true);

-- ─── Queue + trigger: enqueue cells when a scholarship goes published ──

create extension if not exists pgmq;

-- Idempotent queue create (pgmq.create raises if it already exists).
do $$
begin
  perform pgmq.create('archetype_insights_queue');
exception when others then null;
end;
$$;

-- The 19-archetype list lives here so the trigger doesn't need to query
-- another table. When the library changes, this list updates in sync via
-- a new migration. The drain edge function validates against the live
-- TypeScript library too, so a missing/extra id surfaces as a skip row
-- with a clear reason rather than silently writing garbage.
create or replace function enqueue_archetype_insights_for_scholarship()
returns trigger
language plpgsql
security definer
as $$
declare
  archetype_ids text[] := array[
    'bridge-domain-kid','quiet-builder','late-bloomer','foreign-lane-native','quiet-athlete',
    'competition-kid','community-anchor','self-taught','storyteller','quant',
    'operator','translator','open-question','tight-lane','recoverer','contrarian',
    'family-anchor','caregiver','working-kid'
  ];
  a text;
begin
  if not (new.is_published is true) then return new; end if;
  -- On UPDATE: skip if was already published (no transition).
  if (tg_op = 'UPDATE' and old.is_published is true) then
    return new;
  end if;
  foreach a in array archetype_ids loop
    -- Skip if cell already exists (manual regen path is a separate fn).
    if not exists (
      select 1 from scholarship_archetype_insights
      where scholarship_id = new.scholarship_id and archetype_id = a
    ) then
      perform pgmq.send(
        'archetype_insights_queue',
        jsonb_build_object('scholarship_id', new.scholarship_id, 'archetype_id', a)
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_archetype_insights on scholarships;
create trigger trg_enqueue_archetype_insights
  after insert or update of is_published on scholarships
  for each row
  execute function enqueue_archetype_insights_for_scholarship();

-- PostgREST-accessible wrappers for the queue ops. pgmq's own functions
-- live in the pgmq schema and aren't auto-exposed; following the same
-- pattern used by process-email-queue.
create or replace function read_archetype_insights_batch(batch_size integer, vt integer)
returns table (msg_id bigint, message jsonb, read_ct integer, enqueued_at timestamptz)
language plpgsql
security definer
as $$
begin
  return query
  select q.msg_id, q.message, q.read_ct, q.enqueued_at
  from pgmq.read('archetype_insights_queue', vt, batch_size) q;
end;
$$;

create or replace function delete_archetype_insight(p_msg_id bigint)
returns boolean
language plpgsql
security definer
as $$
declare
  ok boolean;
begin
  select pgmq.delete('archetype_insights_queue', p_msg_id) into ok;
  return ok;
end;
$$;

create or replace function archive_archetype_insight(p_msg_id bigint)
returns boolean
language plpgsql
security definer
as $$
declare
  ok boolean;
begin
  select pgmq.archive('archetype_insights_queue', p_msg_id) into ok;
  return ok;
end;
$$;

create or replace function archetype_insights_queue_depth()
returns bigint
language plpgsql
security definer
as $$
declare
  d bigint;
begin
  select queue_length into d from pgmq.metrics('archetype_insights_queue');
  return coalesce(d, 0);
end;
$$;

-- One-shot seeder: enqueues all currently-published scholarships. Safe
-- to re-run — the trigger function's exists-check prevents duplicate
-- queueing, so this is idempotent.
create or replace function seed_archetype_insights_queue_for_published()
returns integer
language plpgsql
security definer
as $$
declare
  archetype_ids text[] := array[
    'bridge-domain-kid','quiet-builder','late-bloomer','foreign-lane-native','quiet-athlete',
    'competition-kid','community-anchor','self-taught','storyteller','quant',
    'operator','translator','open-question','tight-lane','recoverer','contrarian',
    'family-anchor','caregiver','working-kid'
  ];
  enqueued integer := 0;
  s record;
  a text;
begin
  for s in select scholarship_id from scholarships where is_published = true loop
    foreach a in array archetype_ids loop
      if not exists (
        select 1 from scholarship_archetype_insights
        where scholarship_id = s.scholarship_id and archetype_id = a
      ) then
        perform pgmq.send(
          'archetype_insights_queue',
          jsonb_build_object('scholarship_id', s.scholarship_id, 'archetype_id', a)
        );
        enqueued := enqueued + 1;
      end if;
    end loop;
  end loop;
  return enqueued;
end;
$$;
