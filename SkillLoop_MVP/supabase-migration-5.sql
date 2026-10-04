-- ============================================================
-- SkillLoop — Migration 5 (Admin Content Tables + Storage)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-4)
-- ============================================================
--
-- SECURITY NOTE: Admin write access is enforced here at the database
-- level (Row Level Security), not just by hiding the admin page in
-- the app. Even if someone found the admin.html URL directly, Supabase
-- itself will reject any insert/update/delete that isn't coming from
-- the harrisonwebb@mac.com account. Change the email below if that
-- ever changes.
-- ============================================================

-- ---------- lessons ----------
-- One row per lesson "topic" (e.g. Lesson 3 = "Grip Strength").
create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  module text not null check (module in (
    'physical_coordination', 'independence_skills', 'social_skills', 'executive_function'
  )),
  lesson_number integer not null,
  topic_name text not null,
  cover_photo_url text,
  created_at timestamptz not null default now(),
  unique (module, lesson_number)
);

alter table public.lessons enable row level security;

create policy "Anyone signed in can view lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');

create policy "Only admin can insert lessons"
  on public.lessons for insert
  with check (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can update lessons"
  on public.lessons for update
  using (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can delete lessons"
  on public.lessons for delete
  using (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');


-- ---------- assignments ----------
-- One row per assignment within a lesson (video, description, MCQ, reflection prompt).
create table if not exists public.assignments (
  id bigint generated always as identity primary key,
  lesson_id bigint references public.lessons(id) on delete cascade not null,
  assignment_number integer not null,
  title text not null,
  video_url text,
  description text,
  mcq jsonb, -- array of {question, options[4], correctIndex}
  reflection_prompt text,
  created_at timestamptz not null default now(),
  unique (lesson_id, assignment_number)
);

alter table public.assignments enable row level security;

create policy "Anyone signed in can view assignments"
  on public.assignments for select
  using (auth.role() = 'authenticated');

create policy "Only admin can insert assignments"
  on public.assignments for insert
  with check (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can update assignments"
  on public.assignments for update
  using (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can delete assignments"
  on public.assignments for delete
  using (auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');


-- ---------- storage bucket for cover photos ----------
insert into storage.buckets (id, name, public)
values ('lesson-covers', 'lesson-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view lesson cover photos"
  on storage.objects for select
  using (bucket_id = 'lesson-covers');

create policy "Only admin can upload lesson cover photos"
  on storage.objects for insert
  with check (bucket_id = 'lesson-covers' and auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can update lesson cover photos"
  on storage.objects for update
  using (bucket_id = 'lesson-covers' and auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');

create policy "Only admin can delete lesson cover photos"
  on storage.objects for delete
  using (bucket_id = 'lesson-covers' and auth.jwt() ->> 'email' = 'harrisonwebb@mac.com');
