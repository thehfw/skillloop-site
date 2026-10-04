-- ============================================================
-- SkillLoop — Migration 9 (Conversation Practice + Weekly Sessions)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-8)
-- ============================================================

-- ---------- conversation_practice_log ----------
-- One row per completed conversation-practice scenario. Separate from
-- the `reflections` table so staff can review actual social choices
-- distinctly from written reflection answers.
create table if not exists public.conversation_practice_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  module text not null default 'social_skills',
  lesson_number integer not null,
  assignment_number integer not null,
  level integer not null,              -- 1 = multiple choice, 2 = open response
  scenario text not null,
  chosen_option text,                  -- level 1 only
  is_best_choice boolean,              -- level 1 only
  choice_reasoning text,               -- level 1 only — why the best option is best
  student_response text,               -- level 2 only — what the student typed
  ai_character_reply text,             -- level 2 only — in-character AI response
  created_at timestamptz not null default now()
);

alter table public.conversation_practice_log enable row level security;

create policy "Users can view their own conversation practice log"
  on public.conversation_practice_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversation practice log"
  on public.conversation_practice_log for insert
  with check (auth.uid() = user_id);


-- ---------- weekly_sessions ----------
-- Tracks each family's weekly clinician session preference/assignment.
-- NOTE: this is a tracking/visibility layer, not a full calendar system.
-- Actual meeting links, availability conflict-checking, and reminders
-- are expected to come from a real scheduling tool — this table exists
-- so SkillLoop's own product (student view + Clinician Window) can see
-- and manage who is booked when.
create table if not exists public.weekly_sessions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  day_of_week text not null,           -- e.g. 'Monday'
  time_slot text not null,             -- e.g. '3:00 PM'
  status text not null default 'active', -- active | paused | cancelled
  meeting_link text,                   -- filled in by staff once scheduled via real tool
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_sessions enable row level security;

create policy "Users can view their own weekly session"
  on public.weekly_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create their own weekly session"
  on public.weekly_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own weekly session"
  on public.weekly_sessions for update
  using (auth.uid() = user_id);
