# SkillLoop MVP — Update 2 (What's New + 2 Required Steps)

## What's new in this version

- **Onboarding quiz** — new accounts now go: Sign up → 20-question intake quiz → Dashboard.
  Answers are stored per-user and include age range, skill self-assessment across all
  four modules, and optional supports/services context used for clinical eligibility review.
- **Dashboard rebuilt as the landing page** — all 4 modules shown (Physical Coordination live,
  the other three marked Coming Soon), plus a Coming Soon section for the Avatar Economy
  and Game Mode.
- **Fixed left sidebar** on all app pages (cannot be closed) with Menu, Modules,
  Coming Soon, and a Legal section linking Terms of Service, Privacy Policy, and FAQ.
- **Stars** — every completed assignment earns exactly 1 star (stored server-side),
  banked for the future Avatar Shop.
- **Streak + active days** — real consecutive-day streak and rolling-30-day active-day
  count on the dashboard.
- **Total Progress wheel** — four-color quarter ring, one quarter per module. Starts
  completely blank; each quarter fills only from real completed assignments.
- **Physical Coordination module** — intro slides on first open, 20 lesson cubes,
  5 assignment cubes each. Lesson 1 / Assignment 1 is fully live: exercise video,
  5-question quiz (need 4/5), and a 3-sentence written reflection with instant feedback.
  All other lessons/assignments show as Coming Soon until content ships (no fake progress).
- **Legal pages** — terms.html, privacy.html, faq.html (anonymous; no personal names
  anywhere on the site).
- **Themed backgrounds** — brand-color gradient treatment on home, auth, onboarding,
  and app pages.

## Required step 1 — run the new database migration

Supabase → SQL Editor → New query → paste the entire contents of
`supabase-migration-2.sql` → Run.

This adds: the `stars` column + server-side star increment, the
`onboarding_responses` table, and the `reflections` table (all with per-user
security rules). Safe to run once on your existing project.

## Required step 2 — nothing else, but one optional upgrade

The reflection feedback works out of the box with instant automatic feedback.
If you want it graded by real AI instead: create an Anthropic API key at
console.anthropic.com, then in Netlify → Site configuration → Environment
variables add:

    ANTHROPIC_API_KEY = your key

Redeploy, and reflections will be graded by Claude automatically (the automatic
fallback still covers any API hiccups).

## Deploy

Same as always: upload everything in this folder to your GitHub repo
(Add file → Upload files → drag all → Commit). Netlify redeploys automatically.
