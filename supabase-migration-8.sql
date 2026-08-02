-- ============================================================
-- SkillLoop — Migration 8 (IEP / 504 Document Upload)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-7)
-- ============================================================
--
-- IMPORTANT: this bucket is PRIVATE (public = false), unlike the
-- lesson-covers bucket from migration 5. IEP/504 documents can contain
-- disability categories, evaluation results, and other sensitive
-- content — access is restricted to the uploading family only, via
-- per-user folder paths enforced at the storage level.
-- ============================================================

create table if not exists public.iep_504_documents (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  doc_type text not null check (doc_type in ('iep', '504')),
  file_name text not null,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.iep_504_documents enable row level security;

create policy "Users can view their own IEP/504 document records"
  on public.iep_504_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own IEP/504 document records"
  on public.iep_504_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own IEP/504 document records"
  on public.iep_504_documents for delete
  using (auth.uid() = user_id);


-- ---------- private storage bucket ----------
insert into storage.buckets (id, name, public)
values ('iep-504-docs', 'iep-504-docs', false)
on conflict (id) do nothing;

-- Files are stored under a path like {user_id}/{doc_type}-{timestamp}-{filename}.
-- These policies check that the first folder segment matches the
-- uploader's own auth.uid(), so nobody can read or write another
-- family's documents.
create policy "Users can view their own IEP/504 files"
  on storage.objects for select
  using (bucket_id = 'iep-504-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own IEP/504 files"
  on storage.objects for insert
  with check (bucket_id = 'iep-504-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own IEP/504 files"
  on storage.objects for delete
  using (bucket_id = 'iep-504-docs' and (storage.foldername(name))[1] = auth.uid()::text);
