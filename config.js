// ============================================================
// SkillLoop — Public Configuration
// ============================================================
// These are PUBLIC keys — safe to ship in frontend code.
// Supabase's "anon" key is protected by Row Level Security (RLS),
// not by secrecy. Stripe's "publishable" key is designed to be public.
//
// Fill these in with your real project values before deploying.
// See DEPLOY.md for exactly where to find each one.
// ============================================================

window.SKILLLOOP_CONFIG = {
  SUPABASE_URL: 'https://vrnkegfqwaskgzceohbq.supabase.co/rest/v1/
',
  SUPABASE_ANON_KEY: 'sb_publishable_ioc5pumt7N1L5fnmu8pH8w_z11AyqpH
',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
};
