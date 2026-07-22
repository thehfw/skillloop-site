-- ============================================================
-- SkillLoop — Migration 2 (Stars, Onboarding Quiz, Reflections)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after the original supabase-schema.sql)
-- ============================================================

-- Stars: 1 star per completed assignment; spent later in the Avatar Shop
alter table public.profiles
  add column if not exists stars integer not null default 0;

create or replace function public.increment_stars(p_user_id uuid, p_amount integer)
returns void as $$
begin
  update public.profiles
  set stars = stars + p_amount
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ---------- onboarding_responses ----------
-- One row per user: their 20-question intake quiz answers.
-- Feeds skill-level placement AND documents assessment context
-- (IEP/504 status, existing diagnoses, service history) that the
-- clinical team uses for insurance billing eligibility review.
create table if not exists public.onboarding_responses (
  user_id uuid references auth.users on delete cascade primary key,
  answers jsonb not null,
  age_range text,
  completed_at timestamptz not null default now()
);

alter table public.onboarding_responses enable row level security;

create policy "Users can view their own onboarding"
  on public.onboarding_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own onboarding"
  on public.onboarding_responses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own onboarding"
  on public.onboarding_responses for update
  using (auth.uid() = user_id);

-- ---------- reflections ----------
-- One row per submitted written reflection, with the AI feedback shown.
create table if not exists public.reflections (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  module text not null,
  lesson_index integer not null,
  assignment_index integer not null,
  reflection_text text not null,
  ai_feedback text,
  ai_score integer,
  created_at timestamptz not null default now()
);

alter table public.reflections enable row level security;

create policy "Users can view their own reflections"
  on public.reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reflections"
  on public.reflections for insert
  with check (auth.uid() = user_id);
