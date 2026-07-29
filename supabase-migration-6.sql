-- ============================================================
-- SkillLoop — Migration 6 (Detailed Activity Log)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-5)
-- ============================================================
--
-- WHAT THIS CHANGES:
-- activity_log used to hold at most ONE row per user per day (a simple
-- "they visited today" marker). This migration turns it into a real
-- event log: every meaningful action (opening a lesson, watching a
-- video, passing a quiz, submitting a reflection) writes its own
-- timestamped row. "Active day" credit — the number that matters for
-- the 16-day RTM billing threshold — is now earned ONLY by a real
-- submission (a passed quiz or a submitted reflection), not just by
-- opening the app. This is a meaningfully stricter, more defensible
-- definition of engagement.
-- ============================================================

-- Remove the old "one row per day" constraint, whatever it happens to
-- be named, so multiple events can be logged on the same day.
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'activity_log' and con.contype = 'u';
  if cname is not null then
    execute format('alter table public.activity_log drop constraint %I', cname);
  end if;
end $$;

alter table public.activity_log
  add column if not exists event_type text not null default 'page_visit';

alter table public.activity_log
  add column if not exists module text;

alter table public.activity_log
  add column if not exists lesson_number integer;

alter table public.activity_log
  add column if not exists assignment_number integer;

alter table public.activity_log
  add column if not exists payload jsonb;

alter table public.activity_log
  add column if not exists created_at timestamptz not null default now();

comment on column public.activity_log.event_type is
  'One of: login, onboarding_completed, lesson_started, video_watched, '
  'quiz_completed, reflection_submitted. Only quiz_completed and '
  'reflection_submitted count as a qualifying "active day" for billing.';

-- Existing RLS policies (select/insert own rows) already cover the new
-- columns since Postgres RLS is row-level, not column-level — no new
-- policies needed.
