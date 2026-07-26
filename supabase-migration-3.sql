-- ============================================================
-- SkillLoop — Migration 3 (Data Collection Consent)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after supabase-schema.sql and supabase-migration-2.sql)
-- ============================================================

alter table public.profiles
  add column if not exists data_consent_given boolean not null default false;

alter table public.profiles
  add column if not exists data_consent_at timestamptz;

-- Note: the existing "Users can update their own profile" policy from
-- supabase-schema.sql already covers writing these two new columns —
-- no new policy needed.
