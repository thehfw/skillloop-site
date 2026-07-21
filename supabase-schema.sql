-- ============================================================
-- SkillLoop — Supabase Schema
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste all of this → Run)
-- ============================================================

-- ---------- profiles ----------
-- One row per user. Created automatically when someone signs up.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  points integer not null default 0,
  avatar_config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Server-side point increment (avoids read-then-write race conditions
-- when a student completes a lesson)
create or replace function public.increment_points(p_user_id uuid, p_amount integer)
returns void as $$
begin
  update public.profiles
  set points = points + p_amount
  where id = p_user_id;
end;
$$ language plpgsql security definer;


-- ---------- module_progress ----------
-- One row per completed lesson. Powers the progress bars and
-- (later) the RTM billable-activity signal.
create table if not exists public.module_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  module text not null check (module in (
    'physical_coordination', 'independence_skills', 'social_skills', 'executive_function'
  )),
  series_index integer not null,
  lesson_index integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, module, series_index, lesson_index)
);

alter table public.module_progress enable row level security;

create policy "Users can view their own progress"
  on public.module_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.module_progress for insert
  with check (auth.uid() = user_id);


-- ---------- activity_log ----------
-- One row per user per calendar day they were active in the app.
-- This is the direct source of truth for the 16-active-day RTM
-- billing threshold discussed in the SkillLoop financial model.
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  activity_date date not null default current_date,
  unique (user_id, activity_date)
);

alter table public.activity_log enable row level security;

create policy "Users can view their own activity"
  on public.activity_log for select
  using (auth.uid() = user_id);

create policy "Users can log their own activity"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

create policy "Users can upsert their own activity"
  on public.activity_log for update
  using (auth.uid() = user_id);


-- ---------- subscriptions ----------
-- One row per user reflecting their current Stripe subscription status.
-- Written ONLY by the Stripe webhook function (via the service role key),
-- never directly by the client — hence no insert/update policy for users.
create table if not exists public.subscriptions (
  user_id uuid references auth.users on delete cascade primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text, -- active | trialing | past_due | canceled | unpaid
  plan text,   -- premium | standard
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for regular users — the webhook
-- function uses the service role key, which bypasses RLS entirely.
