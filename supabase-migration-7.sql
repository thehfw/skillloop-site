-- ============================================================
-- SkillLoop — Migration 7 (Home Reinforcement, 3-Question Reflections,
-- Meeting Requests, Emotions Journal)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-6)
-- ============================================================

-- ---------- reflections: support 3 open-response answers ----------
-- New submissions store all 3 answers here as an array. The original
-- reflection_text column stays untouched for any legacy single-answer
-- rows already in the database.
alter table public.reflections
  add column if not exists reflection_texts jsonb;

-- ---------- assignments: 3 reflection prompts instead of 1 ----------
-- reflection_prompt (from earlier migrations) becomes "prompt 1".
alter table public.assignments
  add column if not exists reflection_prompt_2 text;

alter table public.assignments
  add column if not exists reflection_prompt_3 text;


-- ---------- meeting_requests ----------
-- One row per "Request Meeting with a SkillLoop Clinician" click.
create table if not exists public.meeting_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  status text not null default 'pending', -- pending | scheduled | completed
  note text,
  created_at timestamptz not null default now()
);

alter table public.meeting_requests enable row level security;

create policy "Users can view their own meeting requests"
  on public.meeting_requests for select
  using (auth.uid() = user_id);

create policy "Users can create their own meeting requests"
  on public.meeting_requests for insert
  with check (auth.uid() = user_id);


-- ---------- emotions_journal ----------
-- Free-write journal entries. entry_text and ai_reply are shown to the
-- student. triage_level / triage_note are for staff use (surfaced via
-- the clinician roster function) and are not rendered in the student UI.
create table if not exists public.emotions_journal (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  entry_text text not null,
  ai_reply text,
  triage_level text default 'none', -- none | check_in | refer_clinic | billable_resource | crisis
  triage_note text,
  created_at timestamptz not null default now()
);

alter table public.emotions_journal enable row level security;

create policy "Users can view their own journal entries"
  on public.emotions_journal for select
  using (auth.uid() = user_id);

create policy "Users can create their own journal entries"
  on public.emotions_journal for insert
  with check (auth.uid() = user_id);
