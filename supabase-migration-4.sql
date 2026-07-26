-- ============================================================
-- SkillLoop — Migration 4 (Birthdate + Guardian Email)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-3)
-- ============================================================

alter table public.profiles
  add column if not exists birthdate date;

alter table public.profiles
  add column if not exists guardian_email text;

-- Re-create the signup trigger so it also captures birthdate and
-- guardian_email (for under-13 signups) straight from the signup form's
-- metadata, at the moment the account is created — this works even if
-- email confirmation is enabled, since it's a database trigger, not
-- something the client has to do after logging in.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, birthdate, guardian_email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'birthdate', '')::date,
    nullif(new.raw_user_meta_data->>'guardian_email', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Note: the existing "Users can update their own profile" policy already
-- covers writing guardian_email later (e.g. from the onboarding quiz's
-- Q21), no new policy needed.
