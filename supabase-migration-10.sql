-- ============================================================
-- SkillLoop — Migration 10 (Star-Rating Reflections)
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Safe to run after migrations 1-9)
-- ============================================================
--
-- Speech & Social's reflection step now offers a simple 1-5 star
-- self-rating instead of 3 written open-response questions. This is
-- stored in its OWN column, separate from ai_score (which means "the
-- AI graded a written answer"), so staff can tell at a glance whether
-- a row is a self-reported rating or an AI-graded written reflection.
-- reflection_text / reflection_texts / ai_feedback / ai_score all stay
-- null on these new star-rating rows.
-- ============================================================

alter table public.reflections
  add column if not exists self_rating integer check (self_rating between 1 and 5);
